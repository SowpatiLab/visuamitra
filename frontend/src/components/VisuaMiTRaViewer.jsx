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
  const alleleMax = Math.max(
    sum(decompRef.lengths),
    sum(decompA1.lengths),
    sum(decompA2.lengths),
    row.alleleLen1 || 0,
    row.alleleLen2 || 0,
    ...meth1.pos,
    ...meth2.pos,
    0
  );

  const visibleLen = Math.min(alleleMax, MAX_VISIBLE_BP);
  const needsScroll = alleleMax > MAX_VISIBLE_BP;
  const methSvgWidth = needsScroll
    ? (alleleMax / visibleLen) * SVG_WIDTH
    : SVG_WIDTH;

  const scaleX = (v) =>
    LEFT_MARGIN +
    (v / alleleMax) * (methSvgWidth - LEFT_MARGIN - RIGHT_MARGIN);

  /*  Y OFFSETS  */
  const decompY = TOP_PADDING;
  const methY = decompY + DECOMP_HEIGHT + GAP;
  const axisY = methY + METH_HEIGHT + GAP;

    const goPrev = () => {
    setSelectedIdx((i) => Math.max(0, i - 1));
    };

    const goNext = () => {
    setSelectedIdx((i) => Math.min(rows.length - 1, i + 1));
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
            right: 230,
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
     <div style={{ textAlign: "center", paddingBottom: "40px"}}>
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

      <MetadataDisplay row={row} />


      <div style={{ display: "flex" }}>
        <div>
          {/*  MAIN SVG  */}
          <svg
            width={SVG_WIDTH}
            height={TOTAL_HEIGHT}
            style={{ border: "1px solid #ccc", background: "#fafafa" }}
          >        
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
              width={SVG_WIDTH}
              height={METH_HEIGHT + METH_AXIS_OFFSET}
            >
              <div
                ref={methScrollRef}
                style={{
                  width: "100%",
                  height: "100%",
                  overflowX: needsScroll ? "auto" : "hidden",
                  overflowY: "hidden",
                }}
              >
                <svg width={methSvgWidth} height={METH_HEIGHT + METH_AXIS_OFFSET}>                  
                  {/* debug – remove later */}
                  <rect
                    x={0}
                    y={METH_HEIGHT}
                    width={methSvgWidth}
                    height={METH_AXIS_OFFSET}
                    fill="rgba(252, 248, 248, 0.1)"
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
                    alleleMax={alleleMax}
                    width={methSvgWidth}
                    leftMargin={LEFT_MARGIN}
                    rightMargin={RIGHT_MARGIN}
                    bottomY={METH_HEIGHT + 15}
                  />
                </svg>
              </div>
            </foreignObject>
          </svg>
        </div>
        <div style={{ marginLeft: 20 }}>
          <Legend colorMap={colorMap} 
           methPalette={settings.methPalette}
           hasDecomposition={hasDecomposition}
           hasAmbiguousMeth={hasAmbiguousMeth}/>
        </div>
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
