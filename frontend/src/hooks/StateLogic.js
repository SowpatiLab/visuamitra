import { useState, useEffect, useCallback } from "react";
import { parseTSV } from "../utils/parseTSV";

export function useVisuaMiTRaLogic(vcfFile, tbiFile, initialState) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pages, setPages] = useState([]);
  const [cursorHistory, setCursorHistory] = useState([initialState?.lastCursor || null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);
  
  // Filtering State
  const [chr, setChr] = useState(initialState?.chr || "");
  const [start, setStart] = useState(initialState?.start || "");
  const [endPos, setEndPos] = useState(initialState?.endPos || "");
  const [filterTrigger, setFilterTrigger] = useState(0);
  const pageSize = initialState?.pageSize || 500;

  const fetchPageTSV = useCallback(async (cursor) => {
    const formData = new FormData();
    formData.append("vcf", vcfFile);
    formData.append("tbi", tbiFile);
    if (chr) formData.append("chr", chr);
    if (start) formData.append("start", start);
    if (endPos) formData.append("end", endPos);
    if (cursor) formData.append("last_cursor", cursor);
    formData.append("page_size", pageSize);

    const res = await fetch("/api/vcf-to-tsv-cursor", {
      method: "POST",
      body: formData,
    });
  
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to fetch page");
    }

    const text = await res.text();
    const nextCursor = res.headers.get("X-Next-Cursor");
    return { text, nextCursor };
  }, [vcfFile, tbiFile, chr, start, endPos, pageSize]);

  // Initial Load & Filter Trigger
  useEffect(() => {
    if (!vcfFile || !tbiFile) return;

    const loadFirstPage = async () => {
      setLoading(true);
      setError("");
      try {
        const { text, nextCursor } = await fetchPageTSV(null);
        const parsed = parseTSV(text);
        setPages([parsed]);
        setCursorHistory([null, nextCursor]);
        setCurrentPageIndex(0);
        setSelectedIdx(parsed.length > 0 ? 0 : null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadFirstPage();
  }, [filterTrigger, vcfFile, tbiFile]);

  const applyRegionFilter = () => setFilterTrigger(prev => prev + 1);

  const goNext = async () => {
    const currentRows = pages[currentPageIndex] || [];
    if (selectedIdx < currentRows.length - 1) {
      setSelectedIdx(i => i + 1);
      return;
    }

    const nextCursor = cursorHistory[currentPageIndex + 1];
    if (!nextCursor) return;

    if (pages[currentPageIndex + 1]) {
      setCurrentPageIndex(i => i + 1);
      setSelectedIdx(0);
      return;
    }

    setLoading(true);
    try {
      const { text, nextCursor: newNext } = await fetchPageTSV(nextCursor);
      const parsed = parseTSV(text);
      setPages(prev => [...prev, parsed].slice(-10)); // Max cache 10
      setCursorHistory(prev => [...prev, newNext].slice(-11));
      setCurrentPageIndex(i => i + 1);
      setSelectedIdx(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goPrev = () => {
    if (selectedIdx > 0) {
      setSelectedIdx(i => i - 1);
    } else if (currentPageIndex > 0) {
      setCurrentPageIndex(i => i - 1);
      setSelectedIdx(pages[currentPageIndex - 1].length - 1);
    }
  };

  return {
    loading, error, pages, currentPageIndex, selectedIdx,
    chr, setChr, start, setStart, endPos, setEndPos,
    setSelectedIdx, applyRegionFilter, goNext, goPrev
  };
}