import React, { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";

import { useVisuaMiTRaLogic } from "../hooks/StateLogic";
import { parseDecompFromTSV } from "../utils/parseDecompInfo";
import { generateMotifColors, getCanonicalMotif, getMethylationColorFactory } from "../utils/colorUtils";

import HeaderSection from "./viewer/HeaderSection";
import NavigationControls from "./viewer/NavigationControls";
import VisualizerCanvas from "./viewer/VisualizerCanvas";
import ZoomControls from "./viewer/ZoomControls";

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

  // Settings & UI State
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState("decomposition");
  const [zoomFactor, setZoomFactor] = useState(1);
  const [settings, setSettings] = useState({
    palette: "Observable10", font: "Arial", theme: "light", methPalette: "Viridis",
  });
  const [isDropDownOpen, setIsDropDownOpen] = useState(false);
  
  // Custom Hook for Data & Pagination
  const {
    loading, error, pages, currentPageIndex, selectedIdx,
    chr, setChr, start, setStart, endPos, setEndPos,
    setSelectedIdx, applyRegionFilter, goNext, goPrev, methThreshold,
    availableSamples = [],
    selectedSampleIndices = [],
     setSelectedSampleIndices,
     paginatedIndices, currentPage, setCurrentPage, setCurrentPageIndex, totalPages,
     hoverX, setHoverX,
     isMetadataExpanded, toggleMetadataExpansion
  } = useVisuaMiTRaLogic(vcfFile, tbiFile, location.state);

  const allLoadedRows = useMemo(() => {
    if (!pages) return [];
    return pages.flat().filter(Boolean);
   }, [pages]);

  const globalSelectedIdx = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < currentPageIndex; i++) {
      if (pages[i] && Array.isArray(pages[i])){
        offset += (pages[i] || []).length;
      }
    }
    return offset + selectedIdx;
  }, [pages, currentPageIndex, selectedIdx]);
  
  const currentRows = pages[currentPageIndex] || [];
  const row = currentRows[selectedIdx] || {};

  if (row.samples && selectedSampleIndices.length > 0) {
      const firstId = selectedSampleIndices[0];
      //console.log("8. DATA FOR FIRST SELECTED SAMPLE:", row.samples[firstId]);
  }

  // Reset scale to 100% whenever data row changes
  React.useEffect(() => {
    if (row.Chrom && row.Chrom) {
      setZoomFactor(1); 
    }
  }, [row.Chrom, row.Start, row.End, selectedIdx]);

  // Scans all samples to ensure every motif has a color assigned
    const colorMap = useMemo(() => {
    const repeatingMotifSet = new Set();
    
    if (row && row.samples && selectedSampleIndices.length > 0) {
      selectedSampleIndices.forEach((idx) => {
        const sampleName = availableSamples[idx];
        const sample = row.samples[sampleName];
        
        // Skip if the sample hasn't loaded or is "NA"
        if (!sample || typeof sample === 'string' || !sample.parsedDecomp) {
          return;
        }

        // Check all tracks (Ref, A1, A2) in the pre-parsed array
        sample.parsedDecomp.forEach((track) => {
          if (track && Array.isArray(track.motifs)) {
            track.motifs.forEach((motif, i) => {
              if (motif && track.copies[i] > 1) {
                const canon = getCanonicalMotif(motif.trim().toUpperCase(), row.Motif?.toUpperCase());
                repeatingMotifSet.add(canon);
              }
            });
          }
        });
      });
    }
  const motifsArray = Array.from(repeatingMotifSet);
  return generateMotifColors(motifsArray, settings.palette, row.Motif);
}, [row, selectedSampleIndices, settings.palette]); // Add selectedSampleIndices as dependency

  const getMethylationColor = useMemo(() => 
    getMethylationColorFactory(settings.methPalette), 
    [settings.methPalette]
  );

  // Layout Constants 
  const LEFT_MARGIN = 140;
  const RIGHT_MARGIN = 30;
  const BASE_WIDTH = 1200;
  const drawWidth = (BASE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN) * zoomFactor;
  const totalSvgWidth = drawWidth + LEFT_MARGIN + RIGHT_MARGIN;

  // Scaling Logic 
  const alleleMax = useMemo(() => {
    let m = row.maxAlleleLen || 0;
    
    if (row.samples && availableSamples.length > 0) {
      selectedSampleIndices.forEach(idx => {
        const sampleName = availableSamples[idx];
        const s = row.samples[sampleName]; // Access by string ID
        if (s?.parsedDecomp) {
          s.parsedDecomp.forEach(track => {
            if (track?.lengths) {
              const sum = track.lengths.reduce((a, b) => a + b, 0);
              m = Math.max(m, sum);
            }
          });
        }
      });
    }
    // Also check the global reference track
    if (row.refTrack?.lengths) {
      const refSum = row.refTrack.lengths.reduce((a, b) => a + b, 0);
      m = Math.max(m, refSum);
    }

    return m || 100; 
  }, [row]);

  // proper linear scale function
  const scaleX = (v) => LEFT_MARGIN + (v / alleleMax) * drawWidth;

  // Render Logic
  const isRowDataMissing = !row || !row.samples || Object.keys(row.samples).length === 0;

  if (!vcfFile) return <div style={{ padding: 50 }}>No VCF file provided. Please go back to home.</div>;
  //console.log("Current methThreshold state:", methThreshold);
  
  const FIXED_WIDTH = 1200;
  console.log("CRITICAL DEBUG:", {
    typeOfSelectedIdx: typeof selectedIdx,
    typeOfGlobalIdx: typeof globalSelectedIdx,
    isRowAnObject: typeof row === 'object' && row !== null,
    rowKeys: row ? Object.keys(row) : []
  });

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
          onPrev={goPrev} 
          onNext={goNext} 
          rows={allLoadedRows} 
          selectedIdx={globalSelectedIdx} 
          onSelect={(globalIdx) => {
            let count = 0;
            for (let i = 0; i < pages.length; i++) {

              const currentPageArr = pages[i];
              if (!currentPageArr) continue;
              const pageLen = pages[i].length;
              if (globalIdx < count + pageLen) {
                // MUST update both to avoid "Initializing" state
                setCurrentPageIndex(i);
                setSelectedIdx(globalIdx - count); 
                return;
              }
              count += pageLen;
            }
          }} 
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
              selectedIndices={selectedSampleIndices}
              availableSamples={availableSamples} 
              isExpanded={isMetadataExpanded}
              onToggle={toggleMetadataExpansion}
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
          paddingTop: "-20px",
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
          maxWidth: "1400px", // Limit expansion on wide screens
          margin: "0 auto",    // Centers the entire visualizer block
          justifyContent: "center", 
          gap: "24px", 
          marginTop: 20
        }}>
        <VisualizerCanvas 
          data={row}
          viewMode={viewMode}
          selectedSamples={paginatedIndices.map(idx => availableSamples[idx])}
          availableSamples={availableSamples}
          loading={loading}
          totalSvgWidth={totalSvgWidth}
          scaleX={scaleX}
          getMethylationColor={getMethylationColor}
          colorMap={colorMap}
          fullLen={alleleMax}
          margins={{ left: LEFT_MARGIN, right: RIGHT_MARGIN }}
          hoverX={hoverX}
          onHoverX={setHoverX}
        />

        <Legend 
          colorMap={colorMap} 
          refMotif={row?.Motif}
          methPalette={settings.methPalette} 
          hasDecomposition={viewMode === "decomposition"} 
          showMethylation={viewMode === "methylation"}
          hasAmbiguousMeth={
            viewMode === "methylation" && 
            selectedSampleIndices.some(idx => {
              const sampleName = availableSamples[idx];
              const sampleData = row.samples?.[sampleName];
              // checks if the string contains "-1" (the ambiguous marker)
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