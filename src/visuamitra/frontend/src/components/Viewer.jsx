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
import SamplePicker from "./SamplePicker";

// Helper for JSON parsing
const safeJson = (s) => {
  if (!s) return null;
  try { return JSON.parse(s.replace(/'/g, '"')); } catch { return null; }
};

export default function Viewer() {
  const location = useLocation();
  const { vcfFile, tbiFile } = location.state || {};
  const { allSamples, initialIndices } = location.state || {};

  // 1. Settings & UI State
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState("decomposition");
  const [zoomFactor, setZoomFactor] = useState(1);
  const [settings, setSettings] = useState({
    palette: "Set3", font: "Arial", theme: "light", methPalette: "Viridis",
  });

  const [isDropDownOpen, setIsDropDownOpen] = useState(false);
  
  // 2. Custom Hook for Data & Pagination
  const {
    loading, error, pages, currentPageIndex, selectedIdx,
    chr, setChr, start, setStart, endPos, setEndPos,
    setSelectedIdx, applyRegionFilter, goNext, goPrev, methThreshold,
    availableSamples = [],
    selectedSampleIndices = [],
     setSelectedSampleIndices,
     paginatedIndices, currentPage, setCurrentPage, totalPages
  } = useVisuaMiTRaLogic(vcfFile, tbiFile, location.state);

// --- 3. Derived Data for Current Row ---
  
  // Define row and currentRows FIRST so the rest of the file can see them
  const currentRows = pages[currentPageIndex] || [];
  const row = currentRows[selectedIdx] || {};

  console.log("5. VIEW MODE:", viewMode);
  console.log("6. CURRENT SELECTED ROW:", row);
  console.log("7. SELECTED SAMPLE INDICES:", selectedSampleIndices);

  if (row.samples && selectedSampleIndices.length > 0) {
      const firstId = selectedSampleIndices[0];
      console.log("8. DATA FOR FIRST SELECTED SAMPLE:", row.samples[firstId]);
  }

  // Reset scale to 100% whenever the data row changes
  React.useEffect(() => {
    if (row.Chrom && row.Chrom) {
      setZoomFactor(1); 
    }
  }, [row.Chrom, row.Start, row.End, selectedIdx]);

  // Color Mapping: Scans all samples to ensure every motif has a color assigned
  const colorMap = useMemo(() => {
    const repeatingMotifSet = new Set();
    if (row.samples) {
      Object.values(row.samples).forEach((sample) => {
        const { ref, a1, a2 } = parseDecompFromTSV(sample.Decomp_info, sample.Decomp_seq) || {};
        [ref, a1, a2].forEach((d) => {
          if (d?.motifs) {
            d.motifs.forEach((motif, i) => { 
              if (d.copies?.[i] > 1) repeatingMotifSet.add(motif); 
            });
          }
        });
      });
    }
    return generateMotifColors([...repeatingMotifSet], settings.palette);
  }, [row, settings.palette]);

  const getMethylationColor = useMemo(() => 
    getMethylationColorFactory(settings.methPalette), 
    [settings.methPalette]
  );

  // Layout Constants (Must be defined BEFORE scaleX)
  const LEFT_MARGIN = 140;
  const RIGHT_MARGIN = 30;
  const BASE_WIDTH = 1200;
  const drawWidth = (BASE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN) * zoomFactor;
  const totalSvgWidth = drawWidth + LEFT_MARGIN + RIGHT_MARGIN;

  // --- 4. Enhanced Scaling Logic ---
  const alleleMax = useMemo(() => {
    // Check the explicitly provided max
    let m = row.maxAlleleLen || 0;
    
    // Safety check: Scan all samples in this row to find the true max
    if (row.samples) {
      Object.values(row.samples).forEach(s => {
        // Parse the decomp info to get the actual sum of segments
        const d = parseDecompFromTSV(s.Decomp_info, s.Decomp_seq);
        if (d) {
          const sums = [
            (d.ref?.lengths || []).reduce((a, b) => a + b, 0),
            (d.a1?.lengths || []).reduce((a, b) => a + b, 0),
            (d.a2?.lengths || []).reduce((a, b) => a + b, 0)
          ];
          m = Math.max(m, ...sums);
        }
      });
    }
    return m || 100; // Fallback to 100 if data is missing
  }, [row]);

  // Use a proper linear scale function
  const scaleX = (v) => LEFT_MARGIN + (v / alleleMax) * drawWidth;

  // 4. Render Logic
  if (loading && pages.length === 0) return <div style={{ padding: 50 }}>Loading Genomic Data...</div>;
  if (!vcfFile) return <div style={{ padding: 50 }}>No VCF file provided. Please go back to home.</div>;
  //console.log("Current methThreshold state:", methThreshold);
  
  const FIXED_WIDTH = 1200;

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

      <div style={{ zIndex: 10, width: "100%", display: "flex", justifyContent: "center", marginTop: "-10px" }}>
        <NavigationControls 
          onPrev={goPrev} onNext={goNext} rows={currentRows} 
          selectedIdx={selectedIdx} onSelect={setSelectedIdx} 
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      <div style={{ marginTop: "-30px", marginBottom: "50px", position: "relative" }}>
        {row.Chrom && (
          <ChromosomeIdeogram 
            chr={row.Chrom} start={Number(row.Start)} end={Number(row.End)} 
            height={80} 
            chrHeight={900}
            chrWidth={20} 
          />
        )}
      </div>

      {/* WRAPPER TO PREVENT DRIFT */}
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={{ 
          width: `${BASE_WIDTH}px`, // 1200px
          display: "flex", 
          justifyContent: "flex-start", // Center the table within the 1200px block
          marginBottom: "20px", 
          boxSizing: "border-box" 
        }}>
          <MetadataDisplay 
              row={row}
              selectedIndices={paginatedIndices}
              availableSamples={availableSamples} 
            />
        </div>
      </div>

      {/* PAGINATION CONTROLS: Only show if > 10 samples */}
        {totalPages > 1 && (
          <div style={paginationStyle}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev 10</button>
            <span>Page {currentPage} of {totalPages} ({selectedSampleIndices.length} samples)</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next 10</button>
          </div>
        )}
      

      {/* CONTROLS SECTION: Centered to screen, 1200px wide */}
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={{ 
          width: `${BASE_WIDTH -90 }px`, // Ensures the green line is exactly canvas width
          marginBottom: "-20px",
          marginLeft: "-200px",
          display: "flex",
          flexDirection: "column" 
        }}>
          <div style={controlsContainerStyle}>
            {/* LEFT SIDE: Tab Switcher */}
            <div className="tab-buttons" style={{ display: "flex" }}>
              <button 
                onClick={() => setViewMode("decomposition")}
                style={viewMode === "decomposition" ? activeTabStyle : inactiveTabStyle}
              >
                Decomposition
              </button>
              <button 
                onClick={() => setViewMode("methylation")}
                style={viewMode === "methylation" ? activeTabStyle : inactiveTabStyle}
              >
                Methylation
              </button>
            </div>

            {/* RIGHT SIDE: Sample Picker */}
            <div style={{ paddingBottom: "5px" }}> {/* Slight offset to clear the line */}
              <SamplePicker 
                availableSamples={availableSamples}
                selectedIndices={selectedSampleIndices}
                onSelectionChange={setSelectedSampleIndices} 
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{display: "flex", 
          width: "100%", 
          overflowX: "auto",
          maxWidth: "1400px", // Limits expansion on ultra-wide screens
          margin: "0 auto",    // Centers the entire visualizer block
          justifyContent: "center", 
          gap: "24px", 
          marginTop: 20
        }}>
        <VisualizerCanvas 
          data={row}
          viewMode={viewMode}
          selectedSamples={paginatedIndices}
          availableSamples={availableSamples}
          totalSvgWidth={totalSvgWidth}
          scaleX={scaleX}
          getMethylationColor={getMethylationColor}
          colorMap={colorMap}
          fullLen={alleleMax}
          margins={{ left: LEFT_MARGIN, right: RIGHT_MARGIN }}
        />

        <Legend 
          colorMap={colorMap} 
          methPalette={settings.methPalette} 
          hasDecomposition={viewMode === "decomposition"} 
          showMethylation={viewMode === "methylation"}
          hasAmbiguousMeth={
            viewMode === "methylation" && 
            selectedSampleIndices.some(idx => {
              const sampleName = availableSamples[idx];
              const sampleData = row.samples?.[sampleName];
              // This checks if the string contains "-1" (the ambiguous marker)
              return sampleData?.Meth_tag?.includes("-1");
            })
          }
          methThreshold={methThreshold}
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

const activeTabStyle = {
  padding: "8px 16px", background: "#328547", color: "#fff", border: "none", 
  borderRadius: "4px 4px 0 0", cursor: "pointer", fontWeight: "bold"
};

const inactiveTabStyle = {
  padding: "8px 16px", background: "#ddd", color: "#666", border: "none", 
  borderRadius: "4px 4px 0 0", cursor: "pointer",
};

const controlsContainerStyle = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-end", 
  width: "`100%`", marginTop: "20px", borderBottom: "2px solid #328547"
};

const paginationStyle = {
  display: "flex", justifyContent: "center", alignItems: "center", 
  gap: "20px", marginBottom: "15px", fontSize: "13px", color: "#555"
};