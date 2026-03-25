import { useState, useEffect, useCallback, useMemo } from "react";
import { parseTSV } from "../utils/parseTSV";

const extractMetadataAndClean = (text, setMethThreshold) => {
  if (!text) return "";
  
  // split by any newline combo to be safe
  const lines = text.split(/\r?\n/);
  
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    
    if (trimmed.startsWith("##METADATA")) {
      const parts = trimmed.split("\t");
      if (parts.length > 1) setMethThreshold(parts[1]);
      return false;
    }
    // Keep ##SAMPLES and everything else
    return true;
  });

  // Re-join with a standard Unix newline
  return filteredLines.join("\n");
};

export function useVisuaMiTRaLogic(vcfFile, tbiFile, initialState) {
  // 1. STATE DEFINITIONS
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pages, setPages] = useState([]);
  const [cursorHistory, setCursorHistory] = useState([initialState?.lastCursor || null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [availableSamples, setAvailableSamples] = useState(initialState?.allSamples || []);
  
  // CRITICAL: Initialize from initialState so the first fetch has the right indices
  const [selectedSampleIndices, setSelectedSampleIndices] = useState(initialState?.initialIndices || [0]);
  
  const [chr, setChr] = useState(initialState?.chr || "");
  const [start, setStart] = useState(initialState?.start || "");
  const [endPos, setEndPos] = useState(initialState?.endPos || "");
  const [filterTrigger, setFilterTrigger] = useState(0);
  const [methThreshold, setMethThreshold] = useState("");
  const pageSize = initialState?.pageSize || 500;

  // --- NEW: PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const SAMPLES_PER_PAGE = 10;

  // Derived: Calculate which indices belong to the current page
  const paginatedIndices = useMemo(() => {
    const offset = (currentPage - 1) * SAMPLES_PER_PAGE;
    return selectedSampleIndices.slice(offset, offset + SAMPLES_PER_PAGE);
  }, [selectedSampleIndices, currentPage]);

  const totalPages = Math.ceil(selectedSampleIndices.length / SAMPLES_PER_PAGE);

  // Reset to page 1 if selection changes and current page becomes empty
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [selectedSampleIndices.length, totalPages, currentPage]);

   // We keep this stable so it doesn't trigger the effect unnecessarily
  const fetchPageTSV = useCallback(async (cursor) => {
    const formData = new FormData();
    formData.append("vcf", vcfFile);
    formData.append("tbi", tbiFile);
    if (chr) formData.append("chr", chr);
    if (start) formData.append("start", start);
    if (endPos) formData.append("end", endPos);
    if (cursor) formData.append("last_cursor", cursor);
    formData.append("page_size", pageSize);

    // Send the sample indices the UI currently has selected
    if (selectedSampleIndices.length > 0) {
      formData.append("samples", selectedSampleIndices.join(","));
    }

    const res = await fetch("/api/vcf-to-tsv-cursor", { method: "POST", body: formData });
    if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to fetch data");
    }

    const text = await res.text();
    const nextCursor = res.headers.get("X-Next-Cursor");
    return { text, nextCursor };
  }, [vcfFile, tbiFile, chr, start, endPos, pageSize, JSON.stringify(selectedSampleIndices)]);

  // 3. THE DATA EFFECT (The "Engine")
  useEffect(() => {
    if (!vcfFile || !tbiFile) return;

    // Use a flag to prevent state updates if component unmounts
    let isMounted = true;

    (async () => {
      setLoading(true);
      setError(""); 
      try {
        const { text, nextCursor } = await fetchPageTSV(null);
        if (!isMounted) return;

        const cleanText = extractMetadataAndClean(text, setMethThreshold);
        const parsed = parseTSV(cleanText);

        // 1. Check if we actually got data first
        if (parsed.length > 0) {
          // 2. Only update sample names if we haven't already initialized them
          if (availableSamples.length === 0) {
            const sampleNamesInFile = new Set();
            parsed.forEach(l => {
              if (l.samples) {
                Object.values(l.samples).forEach(s => sampleNamesInFile.add(s.SampleID));
              }
            });
            setAvailableSamples(Array.from(sampleNamesInFile).sort());
          }
          
          // Clear any previous errors since we have data
          setError(""); 
        } else {
          // 3. THIS is the only time the error should trigger
          setError("No data found for the selected region/samples.");
        }

        setPages([parsed]);
        setCursorHistory([null, nextCursor]);
        setCurrentPageIndex(0);
        setSelectedIdx(parsed.length > 0 ? 0 : null);
      } catch (err) { 
        if (isMounted) setError(err.message); 
      } finally { 
        if (isMounted) setLoading(false); 
      }
    })();

    return () => { isMounted = false; };
    
  }, [filterTrigger, vcfFile, tbiFile]); 

  const goNext = async () => {
    const currentRows = pages[currentPageIndex] || [];
    if (selectedIdx < currentRows.length - 1) {
      setSelectedIdx(i => i + 1);
      return;
    }

    const nextCursor = cursorHistory[currentPageIndex + 1];
    if (!nextCursor) return;

    setLoading(true);
    try {
      const { text, nextCursor: newNext } = await fetchPageTSV(nextCursor);
      // Ensure we use the exact same cleaning/parsing pipeline as the initial load
      const cleaned = extractMetadataAndClean(text, setMethThreshold);
      const parsed = parseTSV(cleaned);
      
      setPages(prev => [...prev, parsed]);
      setCursorHistory(prev => [...prev, newNext]);
      setCurrentPageIndex(i => i + 1);
      setSelectedIdx(0); 
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const goPrev = () => {
    if (selectedIdx > 0) setSelectedIdx(i => i - 1);
    else if (currentPageIndex > 0) {
      setCurrentPageIndex(i => i - 1);
      setSelectedIdx(pages[currentPageIndex - 1].length - 1);
    }
  };

  return {
    loading, error, pages, currentPageIndex, selectedIdx,
    chr, setChr, start, setStart, endPos, setEndPos,
    setSelectedIdx, applyRegionFilter: () => setFilterTrigger(p => p + 1), 
    goNext, goPrev, methThreshold,
    availableSamples, selectedSampleIndices, setSelectedSampleIndices,
    paginatedIndices, currentPage, setCurrentPage, totalPages
  };
}