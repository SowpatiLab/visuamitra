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

  const [rows, setRows] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
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
    tsvText,
    vcfFile,
    tbiFile,
    chr: initChr,
    start: initStart,
    endPos: initEnd,
  } = location.state || {};

  const [chr, setChr] = useState(initChr || "");
  const [start, setStart] = useState(initStart || "");
  const [endPos, setEndPos] = useState(initEnd || "");

  const [visibleRange, setVisibleRange] = useState([0, 0]);

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
  
  useEffect(() => {
    if (location.state?.tsvText) {
      const parsedRows = parseTSV(location.state.tsvText);
      setRows(parsedRows);
      setSelectedIdx(0);
    } else {
      // refresh case → go back to upload
      navigate("/");
    }
  }, [location.state, navigate]);

  // compute alleleMax early (before any return)
  const alleleMax = React.useMemo(() => {
    if (!rows.length || selectedIdx === null) return 0;

    const row = rows[selectedIdx];
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
  }, [rows, selectedIdx]);

    useEffect(() => {
    // only run if we have a valid alleleMax
    if (alleleMax > 0) {
      setVisibleRange([0, alleleMax]);
    }
  }, [alleleMax]);

  const applyRegionFilter = () => {
    if (!chr && !start && !endPos) return;

    const s = start ? Number(start) : -Infinity;
    const e = endPos ? Number(endPos) : Infinity;

    const filtered = rows.filter((r) => {
      if (chr && r.Chrom !== chr) return false;
      if (r.End < s) return false;
      if (r.Start > e) return false;
      return true;
    });

    if (!filtered.length) {
      setError("No data found in this region");
      return;
    }

    setError("");
    setRows(filtered);
    setSelectedIdx(0);
  };
   
  /*  File handling  */
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setRows(parseTSV(reader.result));
      setSelectedIdx(0);
    };
    reader.readAsText(file);
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

  if (!rows.length) {
  return (
    <VCFInputPanel
      onLoad={(tsvText) => {
        const startTime = performance.now();
        const parsedRows = parseTSV(tsvText);
        setRows(parsedRows);
        setSelectedIdx(0);
        console.log("Time to fetch + parse:", performance.now() - startTime, "ms");
      }}
    />
  );
}  

  const row = rows[selectedIdx];

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

    const goPrev = () => {
    setSelectedIdx((i) => Math.max(0, i - 1));
    };

    const goNext = () => {
    setSelectedIdx((i) => Math.min(rows.length - 1, i + 1));
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
            // center horizontal
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
            cursor: "pointer",
            zIndex: 1000,
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
        style={{ width: "64px", height: "56px", verticalAlign: "middle", marginRight: "8px" }}
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
        rows={rows}
        selectedIdx={selectedIdx}
        onSelect={setSelectedIdx}
      />

      {/* IDEOGRAM VIEWER */}
      <ChromosomeIdeogram
        chr={row.Chrom}
        start={row.Start}
        end={row.End}
        heigth={200}
        chrHeight={1000}
        chrWidth={25}
      />

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
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <button onClick={shrinkRange}>–</button>
          <span style={{ margin: "0 12px" }}>
            Scale: {Math.round(zoomFactor * 100)}%
          </span>
          <button onClick={expandRange}>+</button>
        </div>
       
      {/*  Bottom navigation  */}
        <div
        style={{
            marginTop: "16px",
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
            disabled={selectedIdx === 0}
            style={{ padding: "6px 12px" }}
        >
            ⟵ Previous
        </button>

        <div style={{ fontWeight: "bold" }}>
            {row.Chrom}:{row.Start}-{row.End}
        </div>

        <button
            onClick={goNext}
            disabled={selectedIdx === rows.length - 1}
            style={{ padding: "6px 12px" }}
        >
            Next ⟶
        </button>
        </div>
    </div>
  );
}
