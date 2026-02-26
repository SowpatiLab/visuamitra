import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import VCFInputPanel from "./VCFInputPanel";
import { parseTSV } from "../utils/parseTSV";
import { parseDecompFromTSV } from "../utils/parseDecompInfo";
import DecompositionPlot from "./DecompositionPlot";
import MethylationPlot from "./MethylationPlot";
import Axis from "./Axis";
import Legend from "./Legend";
import MetadataDisplay from "./MetaData";
import GenomicLocationPicker from "./GenomicLocationPicker";
import { generateMotifColors, getMethylationColorFactory} from "../utils/colorUtils";
import SettingsPanel from "./SettingsPanel";
import favicon from '../assets/favicon.png'
import ChromosomeIdeogram from "./ChromosomeIdeogram";

function safeJson(s) {
  if (!s) return null;
  try {
    return JSON.parse(s.replace(/'/g, '""'));
  } catch {
    return null;
  }
}

export default function VisuaMiTRaViewer() {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState({
      palette: "Set3",
      font: "Arial",
      theme: "light",
      methPalette: "Viridis",
    });
  const [showSettings, setShowSettings] = useState(false);
  const toggleSettings = () => setShowSettings(!showSettings);
  
  const location = useLocation();
  const navigate = useNavigate();
  const [zoomFactor, setZoomFactor] = useState(1); 

  const {
    vcfFile,
    tbiFile,
    chr: initChr,
    start: initStart,
    endPos: initEnd,
    pageSize: initPageSize,
    lastCursor: initLastCursor,
    tsvText: initialTsvText,
  } = location.state || {};

  // pages of TSV rows
  const [pages, setPages] = useState([]);

  const [cursorHistory, setCursorHistory] = useState([initLastCursor || null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [pageSize, setPageSize] = useState(
      initPageSize ?? location.state?.pageSize ?? 500
    );

  const [chr, setChr] = useState(initChr || "");
  const [start, setStart] = useState(initStart || "");
  const [endPos, setEndPos] = useState(initEnd || "");
  const [visibleRange, setVisibleRange] = useState([0, 0]);
  //const [filterApplyCount, setFilterApplyCount] = useState(0);
  const [filterTrigger, setFilterTrigger] = useState(0);

  const methScrollRef = useRef();

  /*  CONFIG  */
  const MAX_VISIBLE_BP = 500;
  const SCROLL_STEP = 150;
  const LEFT_MARGIN = 140;
  const RIGHT_MARGIN = 30;
  const SVG_WIDTH = 1200;
  const TOP_PADDING = 60;
  const GAP = 20;
  const DECOMP_HEIGHT = 160;        
  const METH_HEIGHT = 170;          
  const AXIS_HEIGHT = 50;
  const METH_AXIS_OFFSET = 40;

  const TOTAL_HEIGHT =
    TOP_PADDING +
    DECOMP_HEIGHT +
    GAP +
    METH_HEIGHT +
    GAP +
    AXIS_HEIGHT;
  
  const MAX_CACHE_SIZE = 10;

  const fetchPageTSV = async (cursor) => {
    const formData = new FormData();
    formData.append("vcf", vcfFile);
    formData.append("tbi", tbiFile);
    if (chr) formData.append("chr", chr);
    if (start) formData.append("start", start);
    if (endPos) formData.append("end", endPos);
    if (cursor) formData.append("last_cursor", cursor);
    formData.append("page_size", pageSize);

    const res = await fetch("http://localhost:8001/api/vcf-to-tsv-cursor", {
      method: "POST",
      body: formData,
    });
  
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to fetch page");
    }

    const text = await res.text();
    const nextCursor = res.headers.get("X-Next-Cursor");
    console.log("Cursor:", nextCursor);
    return { text, nextCursor };
  };

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
  }, [vcfFile, tbiFile, pageSize, filterTrigger]);
  
  // compute alleleMax early (before any return)
  const alleleMax = React.useMemo(() => {
    const currentRows = pages[currentPageIndex] || [];
    if (!currentRows.length || selectedIdx === null) return 0;

    const row = currentRows[selectedIdx] || {};
    const sum = (arr = []) => arr.reduce((a, b) => a + b, 0);

    const methTags = safeJson(row.Meth_tag) || [];
    const meth1pos = methTags[0]?.[0] || [];
    const meth2pos = methTags[1]?.[0] || [];

    const { ref, a1, a2 } =
      parseDecompFromTSV(row.Decomp_info, row.Decomp_seq) || {};

    return Math.max(
      sum(ref?.lengths),
      sum(a1?.lengths),
      sum(a2?.lengths),
      row.alleleLen1 || 0,
      row.alleleLen2 || 0,
      ...meth1pos,
      ...meth2pos,
      0
    );
  }, [pages, currentPageIndex, selectedIdx]);

    useEffect(() => {
    // only run if we have a valid alleleMax
    if (alleleMax > 0) {
      setVisibleRange([0, alleleMax]);
    }
  }, [alleleMax]);

  const applyRegionFilter = () => {
    setPages([]); 
    setCursorHistory([null]);
    setCurrentPageIndex(0);
    setSelectedIdx(null);
    setError("");
    //setFilterApplyCount(count => count + 1);
    setFilterTrigger(prev => prev + 1);
    // triggers the loadFirstPage useEffect
  };
   

  const getMethylationColor = React.useMemo(
      () =>
        getMethylationColorFactory(
          settings.methPalette),
      [settings.methPalette]
    );

  {/*if (!rows.length) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Upload your TSV file</h2>
        <input type="file" accept=".tsv" onChange={handleFile} />
      </div>
    );
  }*/}

  if (!pages[currentPageIndex]?.length) {
    return (
      <VCFInputPanel
        onLoad={(tsvText) => {
          const parsedRows = parseTSV(tsvText);
          setPages([parsedRows]);
          setCursorHistory([null]);
          setCurrentPageIndex(0);
          setSelectedIdx(parsedRows.length > 0 ? 0 : null);
        }}
      />
    );
  }

  const currentRows = pages[currentPageIndex] || [];
  const row = currentRows[selectedIdx] || {};

  /*  Decomposition  */
  const {
    ref: decompRef = { motifs: [], lengths: [] },
    a1: decompA1 = { motifs: [], lengths: [] },
    a2: decompA2 = { motifs: [], lengths: [] },
  } = parseDecompFromTSV(row.Decomp_info, row.Decomp_seq) || {};

  const hasDecomposition =
    decompRef.motifs.length > 0 ||
    decompA1.motifs.length > 0 ||
    decompA2.motifs.length > 0;

  /*  Methylation  */
  const methTags = safeJson(row.Meth_tag) || [];
  const meth1 = { pos: methTags[0]?.[0] || [], lvl: methTags[0]?.[1] || [] };
  const meth2 = { pos: methTags[1]?.[0] || [], lvl: methTags[1]?.[1] || [] };
  const hasAmbiguousMeth =
  meth1.lvl?.some((v) => v === -1) ||
  meth2.lvl?.some((v) => v === -1);

  /*  Colors  */
  // only repeating motifs (copy no > 1)
  const repeatingMotifSet = new Set();
  [decompRef, decompA1, decompA2].forEach((d) => {
    d.motifs?.forEach((motif, i) => {
      if (d.copies?.[i] > 1) {
        repeatingMotifSet.add(motif);
      }
    });
  });

  // Generate colors only for repeating motifs
  const colorMap = generateMotifColors([...repeatingMotifSet], settings.palette);
  // Choose the scale dynamically, e.g., from settings (can add methScale in settings later)
 
  /*  Scaling  */
  const sum = (arr = []) => arr.reduce((a, b) => a + b, 0);
  
  const visibleLen = visibleRange[1] - visibleRange[0];
  const needsScroll = visibleLen > MAX_VISIBLE_BP;

  const methSvgWidth = needsScroll
    ? (visibleLen / MAX_VISIBLE_BP) * SVG_WIDTH
    : SVG_WIDTH;

  const fullLen = alleleMax || 1;

  // scale domain 0→fullLen onto screen 0→(methSvgWidth − margins)
  const scaleX = (v) =>
    LEFT_MARGIN +
    (v / fullLen) * drawWidth;
      

  /*  Y OFFSETS  */
  const decompY = TOP_PADDING;
  const methY = decompY + DECOMP_HEIGHT + GAP;
  const axisY = methY + METH_HEIGHT + GAP;

  const BASE_DRAW_WIDTH = SVG_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;
  const drawWidth = BASE_DRAW_WIDTH * zoomFactor;
  const totalSvgWidth = drawWidth + LEFT_MARGIN + RIGHT_MARGIN;

   const goNext = async () => {
    // move inside current page rows if available
    const currentRows = pages[currentPageIndex] || [];
    if (selectedIdx < currentRows.length - 1) {
      setSelectedIdx(i => i + 1);
      return;
    }

    // otherwise fetch next page
    const nextCursor = cursorHistory[currentPageIndex + 1];
    if (!nextCursor) return; // no more pages

    // if already cached just advance
    if (pages[currentPageIndex + 1]) {
      setCurrentPageIndex(i => i + 1);
      setSelectedIdx(0);
      return;
    }

    // fetch next page
    setLoading(true);
    try {
      const { text, nextCursor: newNext } = await fetchPageTSV(nextCursor);
      const parsed = parseTSV(text);

      setPages(prev => {
        const newPages = [...prev, parsed];
        if (newPages.length > MAX_CACHE_SIZE) {
          newPages.shift(); // drop oldest
        }
        return newPages;
      });

      setCursorHistory(prev => {
        const nextArr = [...prev, newNext];
        if (nextArr.length > MAX_CACHE_SIZE + 1) {
          nextArr.shift(); // keep cursorHistory in sync
        }
        return nextArr;
      });
      setCurrentPageIndex(i => i + 1);
      setSelectedIdx(parsed.length > 0 ? 0 : null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goPrev = () => {
    if (selectedIdx > 0) {
      setSelectedIdx(i => i - 1);
      return;
    }
    if (currentPageIndex > 0) {
      setCurrentPageIndex(i => i - 1);
      setSelectedIdx((pages[currentPageIndex - 1]?.length || 1) - 1);
    }
  };

  const ZOOM_STEP = 0.2; // each click ± 20%

  const expandRange = () => {
    setZoomFactor((z) => Math.min(z + ZOOM_STEP, 10));  // cap at ×10
  };

  const shrinkRange = () => {
    setZoomFactor((z) => Math.max(0.2, z - ZOOM_STEP)); // min ×0.2
  };

  /*  RENDER  */
  return (
    <div
      style={{
        width: "95%",            // full width of parent
        minHeight: "95%",       // at least full viewport height
        display: "flex",
        flexDirection: "column",
        justifyContent: "center", // center vertical
        alignItems: "center",
        paddingTop: 30,
        paddingLeft: 50,
        paddingRight: 50,
        fontFamily: settings.font,
        background: settings.theme === "dark" ? "#111" : "#fafafa",
        color: settings.theme === "dark" ? "#eee" : "#000",
        position: "relative",
      }}
    >
      <div>
      {/* Settings button */}
      {!showSettings && (
        <button
          onClick={() => setShowSettings(true)}
          style={{
            position: "fixed",
            top: 120,
            right: 200,
            padding: "8px 12px",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            zIndex: 1000,
            border: "none",
            borderRadius: 8,
            background: "#328547ff",
            color: "#fff",
            boxShadow: "0px 4px 6px rgba(54, 51, 51, 0.2)"
          }}
        >
          ⚙ Settings
        </button>
      )}

      {/* Settings Card */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
     <div style={{ textAlign: "center", paddingBottom: "40px", paddingTop: "0px"}}>
      <img
        src={favicon}
        alt="VisuaMiTRa Icon"
        style={{ width: "64px", height: "56px", verticalAlign: "middle", marginRight: "8px", borderRadius: 8}}
      />
      <span style={{ fontSize: "24px", fontWeight: "bold" }}>VisuaMiTRa</span>
      </div>

      {/* REGION FILTER TOOLBAR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#f8f9fb",
          marginBottom: 12,
          width: "fit-content",
          whiteSpace: "nowrap",
          boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)"
        }}
      >
        <span style={{ fontWeight: 600 }}>Genomic Region:</span>

        <input
          placeholder="chr (chr1)"
          value={chr}
          onChange={(e) => setChr(e.target.value)}
          style={{ width: 80 }}
        />

        <input
          type="number"
          placeholder="start"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          style={{ width: 100 }}
        />

        <input
          type="number"
          placeholder="end"
          value={endPos}
          onChange={(e) => setEndPos(e.target.value)}
          style={{ width: 100 }}
        />

        <button
          onClick={applyRegionFilter}
          disabled={loading}
          style={{
            marginLeft: "auto",
            padding: "6px 14px",
            borderRadius: 6,
            border: "none",
            background: "#328547ff",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Applying…" : "Apply"}
        </button>
      </div>

      {/* OPTIONAL ERROR MESSAGE */}
      {error && (
        <div style={{ color: "#b00020", fontSize: 13, marginBottom: 8 }}>
          {error}
        </div>
      )}

      {/* ROW PICKER */}
      <GenomicLocationPicker
        rows={pages[currentPageIndex] || []}
        selectedIdx={selectedIdx}
        onSelect={setSelectedIdx}
      />

      {/* IDEOGRAM VIEWER */}
      {row.Chrom && !isNaN(row.Start) && !isNaN(row.End) ? (
        <ChromosomeIdeogram
          chr={row.Chrom}
          start={Number(row.Start)}
          end={Number(row.End)}
          height={100}
          chrHeight={900}
          chrWidth={25}
        />
      ) : (
        <div style={{ fontSize: 14, margin: "8px 0" }}>
          No valid location to display ideogram
        </div>
      )}

      <MetadataDisplay row={row} />     
        {/* MAIN PLOTS + LEGEND WRAPPER */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "24px",  // space between plot and legend
          }}
        >
          {/* LEFT SIDE: Scrollable Plot Area */}
          <div>
            <div
              style={{
                width: SVG_WIDTH,
                display: "block",
                overflowX: "scroll",
                overflowY: "hidden",
                border: "1px solid #ccc",
                background: "#fafafa",
                whiteSpace: "nowrap",
                borderRadius: 10,
                boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.3)"
              }}
            >
              <svg
                style={{ minWidth: totalSvgWidth }}
                height={TOTAL_HEIGHT}
              >
                {/* decomposition + methylation SVG as before */}
                <DecompositionPlot
                  decompRef={decompRef}
                  decompA1={decompA1}
                  decompA2={decompA2}
                  scaleX={scaleX}
                  leftMargin={LEFT_MARGIN}
                  colorMap={colorMap}
                  yOffset={decompY}
                  rowGap={25}
                />

                <foreignObject
                  x="0"
                  y={methY}
                  width={totalSvgWidth}
                  height={METH_HEIGHT + METH_AXIS_OFFSET}
                >
                  <div style={{ width: totalSvgWidth, height: "100%" }}>
                    <svg width={totalSvgWidth} height={METH_HEIGHT + METH_AXIS_OFFSET}>
                      <rect
                        x={0}
                        y={METH_HEIGHT}
                        width={totalSvgWidth}
                        height={METH_AXIS_OFFSET}
                        fill="rgba(252,248,248,0.1)"
                      />
                      <MethylationPlot
                        meth1={meth1}
                        meth2={meth2}
                        alleleLen1={row.alleleLen1}
                        alleleLen2={row.alleleLen2}
                        scaleX={scaleX}
                        leftMargin={LEFT_MARGIN}
                        yStart={20}
                        rowGap={25}
                        getColor={getMethylationColor}
                      />

                      <Axis
                        scale={scaleX}
                        visibleRange={[0, fullLen]}
                        width={totalSvgWidth}
                        leftMargin={LEFT_MARGIN}
                        rightMargin={RIGHT_MARGIN}
                        bottomY={METH_HEIGHT + 15}
                      />
                    </svg>
                  </div>
                </foreignObject>
              </svg>
            </div>
          </div>

          {/* RIGHT SIDE: Legend */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              maxWidth: "260px", // optional width limit
              
            }}
          >
            <Legend
              colorMap={colorMap}
              methPalette={settings.methPalette}
              hasDecomposition={hasDecomposition}
              hasAmbiguousMeth={hasAmbiguousMeth}
            />
          </div>
        </div>

        {/* ZOOM CONTROLS (CENTERED) */}
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <button onClick={shrinkRange}>–</button>
          <span style={{ margin: "0 12px", fontSize: "15px"}}>
            Scale: {Math.round(zoomFactor * 100)}%
          </span>
          <button onClick={expandRange}>+</button>
        </div>
       
      {/*  Bottom navigation  */}
        <div
        style={{
            marginTop: "2px",
            padding: "12px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "24px",
            borderTop: "1px solid #ccc",
            fontSize: "14px",
        }}
        >
        <button
          onClick={goPrev}
          disabled={currentPageIndex === 0 && selectedIdx === 0}
        >
          ⟵ Previous
        </button>

        <button
          onClick={goNext}
          disabled={
            !cursorHistory[currentPageIndex + 1] &&
            selectedIdx === (pages[currentPageIndex]?.length - 1)
          }
        >
          Next ⟶
        </button>
        </div>
    </div>
  );
}
