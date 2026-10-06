import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { parseTSV } from "../utils/parseTSV";
import strchiveCutoffs from "../assets/strchive_cutoffs.json"

const extractMetadataAndClean = (text, setMethThreshold, setAvailableSamples, setRefGenome) => {
  if (!text) return "";
  
  // split by any newline type
  const lines = text.split(/\r?\n/);
  
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    
    // Keep the main column header (starts with one #, not ##)
    if (trimmed.startsWith("#") && !trimmed.startsWith("##")) return true;

    // Extract specific metadata values
    if (trimmed.startsWith("##METADATA")) {
      const parts = trimmed.split("\t");
      if (parts.length > 1) setMethThreshold(parts[1]);
      return false;   
    }

    if (trimmed.startsWith("##REF_GENOME")) {
      const parts = trimmed.split("\t");
      if (parts.length > 1) {
        setRefGenome(parts[1].trim()); // Sets "hg38" or "t2t-chm13"
      }
      return false;
    }
    
    // Drop other file-level headers (##)
    if (trimmed.startsWith("##")) return false;
  
    return true;
  });

  // Re-join with a standard Unix newline
  return filteredLines.join("\n");
};

export function useVisuaMiTRaLogic(vcfFile, tbiFile, initialState, viewMode = "decomposition") {
  // STATE DEFINITIONS
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pages, setPages] = useState([]);
  const [cursorHistory, setCursorHistory] = useState([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [availableSamples, setAvailableSamples] = useState(initialState?.allSamples || []);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const lastSamplesRef = useRef(JSON.stringify(initialState?.initialIndices || [0]));
  const lastPageRef = useRef(1);
  
  // Initialize from initialState so the first fetch has the right indices
  const [selectedSampleIndices, setSelectedSampleIndices] = useState(initialState?.initialIndices || [0]);

  const [customCutoffs, setCustomCutoffs] = useState({
    benignMax: null,
    interMin: null,
    interMax: null,
    pathMin: null,
  });
  const [chr, setChr] = useState(initialState?.chr || "");
  const [start, setStart] = useState(initialState?.start || "");
  const [endPos, setEndPos] = useState(initialState?.endPos || "");
  const [filterTrigger, setFilterTrigger] = useState(0);
  const [methThreshold, setMethThreshold] = useState("");
  const [refGenome, setRefGenome] = useState("hg38");
  const pageSize = initialState?.pageSize || 500;
  const [expectedMotifOverrideColor, setExpectedMotifOverrideColor] = useState(null);

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

  const lastLocusKeyRef = useRef(null);

  // Extract current active row
  const currentRow = pages[currentPageIndex]?.[selectedIdx] || null;

  // DERIVE DEFAULT CUTOFFS FROM THE PRE-BUNDLED STRCHIVE JSON MAP
  const defaultCutoffs = useMemo(() => {
    if (!currentRow || !currentRow.Chrom) {
      return { benignMax: null, interMin: null, interMax: null, pathMin: null };
    }

    // 1. Standardize chromosome prefix ("1" -> "chr1")
    const formattedChrom = currentRow.Chrom.startsWith("chr")
      ? currentRow.Chrom
      : `chr${currentRow.Chrom}`;

    const startNum = Number(currentRow.Start);
    const endNum = Number(currentRow.End);

    // 2. Generate potential coordinate keys (Exact VCF 1-based, BED 0-based Start - 1, and End - 1)
    const coordKeys = [
      `${formattedChrom}:${startNum}-${endNum}`,         // Exact VCF (1-based)
      `${formattedChrom}:${startNum - 1}-${endNum}`,     // Standard 0-based BED (Start - 1)
      `${formattedChrom}:${startNum - 1}-${endNum - 1}`  // 0-based both ends
    ];

    // 3. Extract Gene ID across various common property names
    const rawGene = currentRow.Gene_id || currentRow.Gene || currentRow.GENE || currentRow.gene || currentRow.ID;
    const geneKey = rawGene ? String(rawGene).toUpperCase().trim() : null;

    // 4. Perform Lookup in strchiveCutoffs
    let match = null;

    // Try coordinate keys first
    for (const key of coordKeys) {
      if (strchiveCutoffs[key]) {
        match = strchiveCutoffs[key];
        break;
      }
    }

    // Try Gene ID key if coordinates didn't match
    if (!match && geneKey && strchiveCutoffs[geneKey]) {
      match = strchiveCutoffs[geneKey];
    }

    // 5. Return JSON match if found
    if (match) {
      return {
        benignMax: match.benignMax ?? match.benign_max ?? null,
        interMin:  match.interMin  ?? match.intermediate_min ?? null,
        interMax:  match.interMax  ?? match.intermediate_max ?? null,
        pathMin:   match.pathMin   ?? match.pathogenic_min ?? null,
      };
    }

    // 6. Fallback: Parse values directly from currentRow if present
    const parseVal = (val) => {
      if (val === undefined || val === null || val === "NA" || val === "" || val === "N/A") return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    return {
      benignMax: parseVal(currentRow.benign_max ?? currentRow.BenignMax),
      interMin:  parseVal(currentRow.intermediate_min ?? currentRow.InterMin),
      interMax:  parseVal(currentRow.intermediate_max ?? currentRow.InterMax),
      pathMin:   parseVal(currentRow.pathogenic_min ?? currentRow.PathMin),
    };
  }, [currentRow]);
  useEffect(() => {
    if (currentRow?.Chrom && currentRow?.Start && currentRow?.End) {
      const locusKey = `${currentRow.Chrom}_${currentRow.Start}_${currentRow.End}`;
      
      // Clear manual color override ONLY when moving to a completely different locus row
      if (lastLocusKeyRef.current && lastLocusKeyRef.current !== locusKey) {
        setExpectedMotifOverrideColor(null);
      }
      lastLocusKeyRef.current = locusKey;
    }
  }, [currentPageIndex, selectedIdx, currentRow]);

  // STABLE DEPENDENCY STRINGS FOR USECALLBACK
  const paginatedStr = useMemo(() => JSON.stringify(paginatedIndices), [paginatedIndices]);
  const selectedSamplesStr = useMemo(() => JSON.stringify(selectedSampleIndices), [selectedSampleIndices]);

  const fetchPageTSV = useCallback(async (cursor, signal) => {
    const formData = new FormData();
    formData.append("vcf", vcfFile);
    formData.append("tbi", tbiFile);
    const dynamicPageSize = viewMode === "overview" ? 5000 : pageSize;
    formData.append("page_size", dynamicPageSize);

    // PASS CUSTOM PATHOGENICITY RANGE CUTOFFS
    if (customCutoffs.benignMax !== null) formData.append("benign_max", customCutoffs.benignMax);
    if (customCutoffs.interMin !== null) formData.append("inter_min", customCutoffs.interMin);
    if (customCutoffs.interMax !== null) formData.append("inter_max", customCutoffs.interMax);
    if (customCutoffs.pathMin !== null) formData.append("path_min", customCutoffs.pathMin);

    // DYNAMIC TARGET DETERMINATION
    const targetIndices = viewMode === "overview" ? selectedSampleIndices : paginatedIndices;
    if (targetIndices && targetIndices.length > 0) {
      formData.append("samples", targetIndices.join(","));
    }
    if (cursor) {
      formData.append("last_cursor", cursor);
    } else {
      if (chr) formData.append("chr", chr);
      if (start) formData.append("start", start);
      if (endPos) formData.append("end", endPos);
    }

    const res = await fetch("/api/vcf-to-tsv-cursor", { method: "POST", body: formData, signal });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Failed to fetch data");
    }

    const text = await res.text();
    const nextCursor = res.headers.get("X-Next-Cursor");
    return { text, nextCursor };
  }, [vcfFile, tbiFile, chr, start, endPos, pageSize, viewMode, customCutoffs, paginatedStr, selectedSamplesStr]);

  // THE DATA EFFECT (The "Engine")
  useEffect(() => {
    if (!vcfFile || !tbiFile) return;

    const controller = new AbortController();

    const currentSamplesStr = JSON.stringify(selectedSampleIndices);
    const isSampleChange = currentSamplesStr !== lastSamplesRef.current;
    const isInitialLoad = pages.length === 0;
    const isPageMissing = !pages[currentPageIndex];
    const isFilterReset = filterTrigger > 0;

    const targetIndices = viewMode === "overview" ? selectedSampleIndices : paginatedIndices;
    const activeRow = pages[currentPageIndex]?.[selectedIdx];
    const isDataMissingForCurrentSamples = targetIndices.some(idx => {
      const name = availableSamples[idx];
      return !activeRow?.samples?.[name];
    });

    const shouldFetch = isInitialLoad || isFilterReset || isSampleChange || isPageMissing || isDataMissingForCurrentSamples;

    lastSamplesRef.current = currentSamplesStr;
    lastPageRef.current = currentPage;

    if (!shouldFetch) return;

    let isMounted = true;
    if (filterTrigger > 0 && currentPageIndex === 0) {
      setPages([]);
      setCursorHistory([null]);
    }

    (async () => {
      setLoading(true);
      try {
        const currentCursor = cursorHistory[currentPageIndex];
        if (currentPageIndex > 0 && currentCursor === undefined) {
          setLoading(false);
          return;
        }

        const { text, nextCursor } = await fetchPageTSV(currentCursor, controller.signal);
        
        if (!isMounted) return;

        const cleanText = extractMetadataAndClean(text, setMethThreshold, setAvailableSamples, setRefGenome);
        const parsed = parseTSV(cleanText);

        if (parsed.length === 0) {
          setPages(prev => {
            const newPages = [...prev];
            newPages[currentPageIndex] = [];
            return newPages;
          });
          
          setCursorHistory(prev => {
            const next = [...prev];
            next[currentPageIndex + 1] = nextCursor;
            return next;
          });

          setLoading(false);
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
            return Array.from(new Set([...prev, ...newNames]));
          });

          // LOOP-SAFE SAMPLE INDICES INITIALIZATION
          setSelectedSampleIndices(prev => {
            if (prev.length === 1 && prev[0] === 0) {
              const allNames = Array.from(new Set(parsed.flatMap(locus => 
                Object.values(locus.samples || {}).map(s => s.SampleID).filter(s => s && s !== "NA")
              )));
              if (allNames.length > 1) return allNames.map((_, i) => i).slice(0, 10);
            }
            return prev;
          });

          setPages(prevPages => {
            const newPages = isFilterReset && currentPageIndex === 0 ? [] : [...prevPages];
            if (!newPages[currentPageIndex]) newPages[currentPageIndex] = [];

            const pageMap = new Map();
            newPages[currentPageIndex].forEach((r, i) => {
              if (r) pageMap.set(`${r.Chrom}_${r.Start}_${r.End}`, i);
            });

            parsed.forEach(newRow => {
              if (!newRow || newRow.Chrom === "Chrom") return;

              const locusKey = `${newRow.Chrom}_${newRow.Start}_${newRow.End}`;
              
              if (pageMap.has(locusKey)) {
                const existingIdx = pageMap.get(locusKey);
                newPages[currentPageIndex][existingIdx] = {
                  ...newPages[currentPageIndex][existingIdx],
                  samples: {
                    ...newPages[currentPageIndex][existingIdx].samples,
                    ...newRow.samples
                  }
                };
              } else {
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
        if (err.name !== "AbortError" && isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { 
      isMounted = false;
      controller.abort();
    };
  }, [filterTrigger, selectedSampleIndices, vcfFile, tbiFile, currentPageIndex, chr, start, endPos, currentPage, viewMode, fetchPageTSV]);

  const goNext = () => {
    const currentRows = pages[currentPageIndex] || [];
    
    if (selectedIdx < currentRows.length - 1) {
      setSelectedIdx(prev => prev + 1);
      return;
    }

    const nextCursor = cursorHistory[currentPageIndex + 1];
    
    if (nextCursor !== undefined && nextCursor !== null) {
      setCurrentPageIndex(prev => prev + 1);
      setSelectedIdx(0);
    } else if (nextCursor === null && !loading) {
      setCurrentPageIndex(prev => prev + 1);
      setSelectedIdx(0);
    } else {
      console.log("End of data reached.");
    }
  };

  const goPrev = () => {
    if (selectedIdx > 0) {
      setSelectedIdx(i => i - 1);
    } else if (currentPageIndex > 0) {
      const prevPageIndex = currentPageIndex - 1;
      const prevPageData = pages[prevPageIndex] || [];
      setCurrentPageIndex(prevPageIndex);
      setSelectedIdx(prevPageData.length > 0 ? prevPageData.length - 1 : 0);
    }
  };

  return {
    loading, error, pages, currentPageIndex, selectedIdx, setCurrentPageIndex,
    chr, setChr, start, setStart, endPos, setEndPos,
    setSelectedIdx, 
    applyRegionFilter: () => {
      setError(null);
      setPages([]); 
      setCursorHistory([null]);
      setCurrentPageIndex(0);
      setSelectedIdx(0);
      setFilterTrigger(p => p + 1); 
    },
    goNext, goPrev, methThreshold,
    refGenome,
    availableSamples, selectedSampleIndices, setSelectedSampleIndices,
    paginatedIndices, currentPage, setCurrentPage, totalPages,
    hoverX, setHoverX,
    isMetadataExpanded, toggleMetadataExpansion: () => setIsMetadataExpanded(prev => !prev),
    expectedMotifOverrideColor, setExpectedMotifOverrideColor,
    defaultCutoffs,
    customCutoffs,
    updateCutoffs: (newCutoffs) => {
      setCustomCutoffs((prev) => {
        const isSame =
          prev.benignMax === newCutoffs.benignMax &&
          prev.interMin === newCutoffs.interMin &&
          prev.interMax === newCutoffs.interMax &&
          prev.pathMin === newCutoffs.pathMin;

        if (isSame) return prev;
        
        setFilterTrigger((p) => p + 1);
        return newCutoffs;
      });
    },

    resetCutoffs: () => {
      setCustomCutoffs((prev) => {
        if (
          prev.benignMax === null &&
          prev.interMin === null &&
          prev.interMax === null &&
          prev.pathMin === null
        ) {
          return prev;
        }
        
        setFilterTrigger((p) => p + 1);
        return { benignMax: null, interMin: null, interMax: null, pathMin: null };
      });
    }
  };
}