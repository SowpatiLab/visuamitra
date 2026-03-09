import React, { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";

// Logic & Utilities
import { useVisuaMiTRaLogic } from "../hooks/StateLogic";
import { parseDecompFromTSV } from "../utils/parseDecompInfo";
import { generateMotifColors, getMethylationColorFactory } from "../utils/colorUtils";

// Extracted Sub-Components
import HeaderSection from "./viewer/HeaderSection";
import NavigationControls from "./viewer/NavigationControls";
import VisualizerCanvas from "./viewer/VisualizerCanvas";
import ZoomControls from "./viewer/ZoomControls";

// Existing Components
import MetadataDisplay from "./MetaData";
import ChromosomeIdeogram from "./ChromosomeIdeogram";
import SettingsPanel from "./SettingsPanel";
import Legend from "./Legend";

// Helper for JSON parsing
const safeJson = (s) => {
  if (!s) return null;
  try { return JSON.parse(s.replace(/'/g, '"')); } catch { return null; }
};

export default function Viewer() {
  const location = useLocation();
  const { vcfFile, tbiFile } = location.state || {};

  // 1. Settings & UI State
  const [showSettings, setShowSettings] = useState(false);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [settings, setSettings] = useState({
    palette: "Set3",
    font: "Arial",
    theme: "light",
    methPalette: "Viridis",
  });

  // 2. Custom Hook for Data & Pagination
  const {
    loading, error, pages, currentPageIndex, selectedIdx,
    chr, setChr, start, setStart, endPos, setEndPos,
    setSelectedIdx, applyRegionFilter, goNext, goPrev
  } = useVisuaMiTRaLogic(vcfFile, tbiFile, location.state);

  // 3. Derived Data for Current Row
  const currentRows = pages[currentPageIndex] || [];
  const row = currentRows[selectedIdx] || {};

  // Decomposition Parsing
  const { ref: decompRef, a1: decompA1, a2: decompA2 } = useMemo(() => 
    parseDecompFromTSV(row.Decomp_info, row.Decomp_seq) || 
    { ref: { motifs: [], lengths: [] }, a1: { motifs: [], lengths: [] }, a2: { motifs: [], lengths: [] } }
  , [row]);

  // Methylation Parsing
  const methTags = useMemo(() => safeJson(row.Meth_tag) || [], [row.Meth_tag]);
  const meth1 = { pos: methTags[0]?.[0] || [], lvl: methTags[0]?.[1] || [] };
  const meth2 = { pos: methTags[1]?.[0] || [], lvl: methTags[1]?.[1] || [] };
  
  const hasAmbiguousMeth = meth1.lvl?.some(v => v === -1) || meth2.lvl?.some(v => v === -1);
  const hasDecomposition = decompRef.motifs.length > 0 || decompA1.motifs.length > 0 || decompA2.motifs.length > 0;

  // Color Mapping
  const getMethylationColor = useMemo(() => getMethylationColorFactory(settings.methPalette), [settings.methPalette]);
  
  const colorMap = useMemo(() => {
    const repeatingMotifSet = new Set();
    [decompRef, decompA1, decompA2].forEach((d) => {
      d.motifs?.forEach((motif, i) => { if (d.copies?.[i] > 1) repeatingMotifSet.add(motif); });
    });
    return generateMotifColors([...repeatingMotifSet], settings.palette);
  }, [decompRef, decompA1, decompA2, settings.palette]);

  // Scaling Logic
  const alleleMax = useMemo(() => {
    if (!row.Chrom) return 1;
    const sum = (arr = []) => arr.reduce((a, b) => a + b, 0);
    return Math.max(sum(decompRef.lengths), sum(decompA1.lengths), sum(decompA2.lengths), row.alleleLen1 || 0, row.alleleLen2 || 0, 0);
  }, [row, decompRef, decompA1, decompA2]);

  const LEFT_MARGIN = 140;
  const RIGHT_MARGIN = 30;
  const BASE_WIDTH = 1200;
  const drawWidth = (BASE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN) * zoomFactor;
  const totalSvgWidth = drawWidth + LEFT_MARGIN + RIGHT_MARGIN;

  const scaleX = (v) => LEFT_MARGIN + (v / (alleleMax || 1)) * drawWidth;

  // 4. Render Logic
  if (loading && pages.length === 0) return <div style={{ padding: 50 }}>Loading Genomic Data...</div>;
  if (!vcfFile) return <div style={{ padding: 50 }}>No VCF file provided. Please go back to home.</div>;

  return (
    <div style={{
      width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: settings.font, background: settings.theme === "dark" ? "#111" : "#fafafa",
      color: settings.theme === "dark" ? "#eee" : "#000", padding: "30px 0"
    }}>
      
     {/* Settings Panel Overlay */}
      {showSettings && (
        <SettingsPanel 
          settings={settings} 
          onChange={setSettings} 
          onClose={() => setShowSettings(false)} 
        />
      )}

      {/* Header now receives the onOpenSettings prop */}
      <HeaderSection 
        chr={chr} 
        setChr={setChr} 
        start={start} 
        setStart={setStart} 
        endPos={endPos} 
        setEndPos={setEndPos}
        onApply={applyRegionFilter} 
        loading={loading} 
        error={error}
      />

      <NavigationControls 
        onPrev={goPrev} onNext={goNext} rows={currentRows} 
        selectedIdx={selectedIdx} onSelect={setSelectedIdx} 
        onOpenSettings={() => setShowSettings(true)}

      />

      {row.Chrom && <ChromosomeIdeogram chr={row.Chrom} start={Number(row.Start)} end={Number(row.End)} 
          height={100}
          chrHeight={900}
          chrWidth={25} />}

      <MetadataDisplay row={row} />

      <div style={{ display: "flex", width: "100%", justifyContent: "center", gap: "24px", marginTop: 20 }}>
        <VisualizerCanvas 
          totalSvgWidth={totalSvgWidth}
          scaleX={scaleX}
          decompData={{ decompRef, decompA1, decompA2 }}
          methData={{ meth1, meth2 }}
          alleleLens={{ a1: row.alleleLen1, a2: row.alleleLen2 }}
          getMethylationColor={getMethylationColor}
          colorMap={colorMap}
          fullLen={alleleMax}
          margins={{ left: LEFT_MARGIN, right: RIGHT_MARGIN }}
        />

        <Legend 
          colorMap={colorMap} 
          methPalette={settings.methPalette} 
          hasDecomposition={hasDecomposition} 
          hasAmbiguousMeth={hasAmbiguousMeth} 
        />
      </div>

      <ZoomControls zoomFactor={zoomFactor} setZoomFactor={setZoomFactor} />
    </div>
  );
}

const settingsButtonStyle = {
  position: "fixed", top: 20, right: 20, padding: "8px 16px",
  borderRadius: 8, background: "#328547", color: "#fff", cursor: "pointer", border: "none", zIndex: 100
};