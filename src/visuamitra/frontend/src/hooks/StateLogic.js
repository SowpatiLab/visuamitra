import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { parseTSV } from "../utils/parseTSV";

const extractMetadataAndClean = (text, setMethThreshold, setAvailableSamples) => {
  if (!text) return "";
  
  // split by any newline combo to be safe
  const lines = text.split(/\r?\n/);
  
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    
    // 1. Keep the main column header (starts with one #, not ##)
    if (trimmed.startsWith("#") && !trimmed.startsWith("##")) return true;

    // 2. Extract specific metadata values
    if (trimmed.startsWith("##METADATA")) {
      const parts = trimmed.split("\t");
      if (parts.length > 1) setMethThreshold(parts[1]);
      return false;   
    }
    
    // 3. Drop other file-level headers (##)
    if (trimmed.startsWith("##")) return false;
    
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
  const [cursorHistory, setCursorHistory] = useState([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [availableSamples, setAvailableSamples] = useState(initialState?.allSamples || []);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const lastSamplesRef = useRef(JSON.stringify(initialState?.initialIndices || [0]));
  
  // CRITICAL: Initialize from initialState so the first fetch has the right indices
  const [selectedSampleIndices, setSelectedSampleIndices] = useState(initialState?.initialIndices || [0]);
  
  const [chr, setChr] = useState(initialState?.chr || "");
  const [start, setStart] = useState(initialState?.start || "");
  const [endPos, setEndPos] = useState(initialState?.endPos || "");
  const [filterTrigger, setFilterTrigger] = useState(0);
  const [methThreshold, setMethThreshold] = useState("");
  const pageSize = initialState?.pageSize || 500;

  // PAGINATION STATE 
  const [currentPage, setCurrentPage] = useState(1);
  const SAMPLES_PER_PAGE = 10;

  // Derived: Calculate which indices belong to the current page
  const paginatedIndices = useMemo(() => {
    const offset = (currentPage - 1) * SAMPLES_PER_PAGE;
    return selectedSampleIndices.slice(offset, offset + SAMPLES_PER_PAGE);
  }, [selectedSampleIndices, currentPage]);

  const totalPages = Math.ceil(selectedSampleIndices.length / SAMPLES_PER_PAGE);

  const [hoverX, setHoverX] = useState(null);

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
    formData.append("page_size", pageSize);

    // Send selected sample indices
    if (selectedSampleIndices && selectedSampleIndices.length > 0) {
      formData.append("samples", selectedSampleIndices.join(","));
    }

    if (cursor) {
      // CRITICAL: When paging with a cursor, DO NOT send chr/start/end.
      // The cursor contains the global byte offset. Removing 'chr' 
      // allows the VCF reader to roll into the next chromosome.
      formData.append("last_cursor", cursor);
    } else {
      // Only send genomic filters for the initial search or "Apply"
      if (chr) formData.append("chr", chr);
      if (start) formData.append("start", start);
      if (endPos) formData.append("end", endPos);
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

    console.log("ENGINE STATUS:", { 
    hasVcf: !!vcfFile, 
    pagesLength: pages.length, 
    trigger: filterTrigger, 
    isSampleChange: JSON.stringify(selectedSampleIndices) !== lastSamplesRef.current 
  });
  if (!vcfFile || !tbiFile) return;

  const currentSamplesStr = JSON.stringify(selectedSampleIndices);
  const isSampleChange = currentSamplesStr !== lastSamplesRef.current;
  
  const isInitialLoad = pages.length === 0;
  const isPageMissing = !pages[currentPageIndex];
  const isFilterReset = filterTrigger > 0;

  const shouldFetch = isInitialLoad || isFilterReset ||  filterTrigger > 0 || isSampleChange || isPageMissing;

  

  lastSamplesRef.current = currentSamplesStr;
  if (!shouldFetch) return;

  let isMounted = true;

  (async () => {
    setLoading(true);
    try {
      // Use the cursor for the page we are currently looking at
      const currentCursor = cursorHistory[currentPageIndex];      // it means the backend previously told us there is no more data.
      if (currentPageIndex > 0 && currentCursor === undefined) {
        console.log("No more data to fetch.");
        setLoading(false);
        return;
      }
      const { text, nextCursor } = await fetchPageTSV(currentCursor);
      
      if (!isMounted) return;

      const cleanText = extractMetadataAndClean(text, setMethThreshold);
      const parsed = parseTSV(cleanText);

      if (parsed.length === 0) {
        setLoading(false);
        // If we tried to go to a next page but found nothing, roll back
        if (currentPageIndex > 0) {
          setCurrentPageIndex(prev => prev - 1);
          // Set this specific index to undefined so 'goNext' knows it's the end
          setCursorHistory(prev => {
            const next = [...prev];
            next[currentPageIndex] = undefined; 
            return next;
          });
        }
        return; 
      }

      if (parsed.length > 0) {
        setAvailableSamples(prev => {
          const newNames = [];
          parsed.forEach(locus => {
            if (locus.samples) {
              Object.values(locus.samples).forEach(s => {
                if (s.SampleID && s.SampleID !== "NA") newNames.push(s.SampleID);
              });
            }
          });
          const combined = Array.from(new Set([...prev, ...newNames]));
          
          // CRITICAL: If we only had a dummy index [0], and we just found real samples,
          // update selectedSampleIndices to show the first 10 real samples.
          if (selectedSampleIndices.length === 1 && selectedSampleIndices[0] === 0 && combined.length > 1) {
            setSelectedSampleIndices(combined.map((_, i) => i).slice(0, 10));
          }
          
          return combined;
        });
        
      setPages(prevPages => {
        const newPages = filterTrigger > 0 && currentPageIndex === 0 ? [] : [...prevPages];
        if (!newPages[currentPageIndex]) newPages[currentPageIndex] = [];

        // Create a map of existing indices in the CURRENT page for faster lookup
        const pageMap = new Map();
        newPages[currentPageIndex].forEach((r, i) => {
          if (r) pageMap.set(`${r.Chrom}_${r.Start}_${r.End}`, i);
        });

        parsed.forEach(newRow => {
          if (!newRow || newRow.Chrom === "Chrom") return;

          const locusKey = `${newRow.Chrom}_${newRow.Start}_${newRow.End}`;
          
          if (pageMap.has(locusKey)) {
            // If locus exists, merge only the sample data
            const existingIdx = pageMap.get(locusKey);
            newPages[currentPageIndex][existingIdx] = {
              ...newPages[currentPageIndex][existingIdx],
              samples: {
              ...newPages[currentPageIndex][existingIdx].samples,
              ...newRow.samples
              }
            };
          } else {
            // If it's a brand new locus, add it
            newPages[currentPageIndex].push(newRow);
            pageMap.set(locusKey, newPages[currentPageIndex].length - 1);
          }
        });
        return newPages;
      });

        setCursorHistory(prev => {
          const next = [...prev];
          next[currentPageIndex + 1] = nextCursor;
          return next;
        });
      }
    } catch (err) {
      if (isMounted) setError(err.message);
    } finally {
      if (isMounted) setLoading(false);
    }
  })();

  return () => { isMounted = false; };
}, [filterTrigger, selectedSampleIndices, vcfFile, tbiFile, currentPageIndex, chr, start, endPos]);


const goNext = () => {
  const currentRows = pages[currentPageIndex] || [];
  
  if (selectedIdx < currentRows.length - 1) {
    setSelectedIdx(prev => prev + 1);
    return;
  }

  const nextCursor = cursorHistory[currentPageIndex + 1];
  
  if (nextCursor) {
    setCurrentPageIndex(prev => prev + 1);
    setSelectedIdx(0);
  } else {
    console.log("Crossing chromosome boundaries...");

    const lastValidCursor = cursorHistory[currentPageIndex] || null;
    // We have reached the end of the specified region (e.g., end of chr1 results)
    // Clear filters to allow the cursor to move to the next chromosome in the file
    setChr(""); 
    setStart("");
    setEndPos("");
    setPages([]);
    setCurrentPageIndex(0);
    setSelectedIdx(0);
    setCursorHistory([lastValidCursor])
    
    setFilterTrigger(p => p + 1);
  }
};

  const goPrev = () => {
  if (selectedIdx > 0) {
    setSelectedIdx(i => i - 1);
  } else if (currentPageIndex > 0) {
    const prevPageIndex = currentPageIndex - 1;
    const prevPageData = pages[prevPageIndex] || [];
    
    // Update both states
    setCurrentPageIndex(prevPageIndex);
    setSelectedIdx(prevPageData.length > 0 ? prevPageData.length - 1 : 0);
  }
};

  return {
    loading, error, pages, currentPageIndex, selectedIdx, setCurrentPageIndex,
    chr, setChr, start, setStart, endPos, setEndPos,
    setSelectedIdx, 
    applyRegionFilter: () => {
    setPages([]); 
    setCursorHistory([null]);
    setCurrentPageIndex(0);
    setSelectedIdx(0);
    
    // 2. Trigger the fetch engine
    setFilterTrigger(p => p + 1); },
    goNext, goPrev, methThreshold,
    availableSamples, selectedSampleIndices, setSelectedSampleIndices,
    paginatedIndices, currentPage, setCurrentPage, totalPages,
    hoverX, setHoverX,
    isMetadataExpanded, toggleMetadataExpansion: () => setIsMetadataExpanded(prev => !prev),
  };
}