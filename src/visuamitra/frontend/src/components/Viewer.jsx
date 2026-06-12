import React, { useState, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";

import { useVisuaMiTRaLogic } from "../hooks/StateLogic";
import { parseDecompFromTSV } from "../utils/parseDecompInfo";
import { generateMotifColors, getCanonicalMotif, getMethylationColorFactory, getVisibleColorMap } from "../utils/colorUtils";

import HeaderSection from "./viewer/HeaderSection";
import NavigationControls from "./viewer/NavigationControls";
import VisualizerCanvas from "./viewer/VisualizerCanvas";
import ZoomControls from "./viewer/ZoomControls";

import MetadataDisplay from "./MetaData";
import ChromosomeIdeogram from "./ChromosomeIdeogram";
import SettingsPanel from "./SettingsPanel";
import Legend from "./Legend";
import SamplePicker from "./SamplePicker";
import DownloadManager from "./DownloadManager";

const safeJson = (s) => {
  if (!s) return null;
  try { return JSON.parse(s.replace(/'/g, '"')); } catch { return null; }
};

export default function Viewer() {
  const location = useLocation();
  const { vcfFile, tbiFile } = location.state || {};
  const { allSamples, initialIndices } = location.state || {};

  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState("decomposition");
  const [zoomFactor, setZoomFactor] = useState(1);
  const [settings, setSettings] = useState({
    palette: "Observable10", font: "Arial", theme: "light", methPalette: "Viridis", baseFontSize: 13
  });
  const [isDropDownOpen, setIsDropDownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const visualizerRef = useRef(null);
  const legendRef = useRef(null);
  const metadataRef = useRef(null);
  const titleRef = useRef(null);

  const activePaletteSwatches = useMemo(() => {
    const paletteMap = {
      Tableau10: ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"],
      Observable10: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"],
      Set1: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#999999"],
      Set2: ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494", "#b3b3b3"],
      Set3: ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#bc80bd", "#ccebc5", "#ffed6f"],
      Paired: ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99", "#b15928"],
      Dark2: ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d", "#666666"],
      Accent: ["#7fc97f", "#beaed4", "#fdc086", "#ffff99", "#386cb0", "#f0027f", "#bf5b17", "#666666"],
      Pastel1: ["#fbb4ae", "#b3cde3", "#ccebc5", "#decbe4", "#fed9a6", "#ffffcc", "#e5d8bd", "#fddaec", "#f2f2f2"],
      Pastel2: ["#b3e2cd", "#f4cae4", "#cbd5e8", "#fdcdac", "#cbd5e8", "#e6f5c9", "#fff2ae", "#f1e2cc"]
    };
    return paletteMap[settings.palette] || paletteMap["Observable10"];
  }, [settings.palette]);

  const {
    loading, error, setError, pages, currentPageIndex, selectedIdx,
    chr, setChr, start, setStart, endPos, setEndPos,
    setSelectedIdx, applyRegionFilter, goNext, goPrev, methThreshold,
    availableSamples = [],
    selectedSampleIndices = [],
    setSelectedSampleIndices,
    paginatedIndices, currentPage, setCurrentPage, setCurrentPageIndex, totalPages,
    hoverX, setHoverX,
    isMetadataExpanded, toggleMetadataExpansion,
    refGenome, expectedMotifOverrideColor, setExpectedMotifOverrideColor
  } = useVisuaMiTRaLogic(vcfFile, tbiFile, location.state, viewMode);

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

  React.useEffect(() => {
    if (row.Chrom) {
      setZoomFactor(1); 
    }
  }, [row.Chrom, row.Start, row.End, selectedIdx]);

  const colorMap = useMemo(() => {
    const repeatingMotifSet = new Set();
    if (row && row.samples && availableSamples.length > 0) {
      availableSamples.forEach((sampleName) => {
        const sample = row.samples[sampleName];
        if (!sample || typeof sample === 'string' || !sample.parsedDecomp) return;
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
    const motifsArray = Array.from(repeatingMotifSet).sort((a,b) => a.localeCompare(b));
    const generatedMap = generateMotifColors(motifsArray, settings.palette, row.Motif);
    const canonicalRef = row.Motif ? getCanonicalMotif(row.Motif, row.Motif) : "";
    if (canonicalRef && expectedMotifOverrideColor) {
      generatedMap[canonicalRef] = expectedMotifOverrideColor;
    }
    return generatedMap;
  }, [row, availableSamples, settings.palette, expectedMotifOverrideColor]);

  const getMethylationColor = useMemo(() => 
    getMethylationColorFactory(settings.methPalette), 
    [settings.methPalette]
  );

  const LEFT_MARGIN = 140;
  const RIGHT_MARGIN = 30;
  const BASE_WIDTH = 1200;
  const drawWidth = (BASE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN) * zoomFactor;
  const totalSvgWidth = drawWidth + LEFT_MARGIN + RIGHT_MARGIN;

  const currentFontSize = settings.baseFontSize || 13;

  const alleleMax = useMemo(() => {
    let m = row.maxAlleleLen || 0;
    if (row.samples && availableSamples.length > 0) {
      selectedSampleIndices.forEach(idx => {
        const sampleName = availableSamples[idx];
        const s = row.samples[sampleName];
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
    if (row.refTrack?.lengths) {
      const refSum = row.refTrack.lengths.reduce((a, b) => a + b, 0);
      m = Math.max(m, refSum);
    }
    return m || 100; 
  }, [row, selectedSampleIndices, availableSamples]);

  const scaleX = (v) => LEFT_MARGIN + (v / alleleMax) * drawWidth;

  const isSingleSample = selectedSampleIndices.length === 1;
  const effectiveViewMode = (isSingleSample && viewMode !== "overview") ? "combined" : viewMode;

  if (!vcfFile) return <div style={{ padding: 50 }}>No VCF file provided. Please go back to home.</div>;

  return (
    <div style={{
      width: "100%", 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center",
      fontFamily: settings.font, 
      /* GLOBAL INHERITANCE */
      fontSize: `${currentFontSize}px`, 
      background: settings.theme === "dark" ? "#111" : "#fafafa",
      color: settings.theme === "dark" ? "#eee" : "#000", 
      padding: "30px 0"
    }}>
      
      {showSettings && (
        <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />
      )}

      <HeaderSection 
        chr={chr} setChr={setChr} start={start} setStart={setStart} endPos={endPos} setEndPos={setEndPos}
        onApply={applyRegionFilter} loading={loading} error={error} setError={setError} rows={allLoadedRows}
      />

      <div style={{ zIndex: 10, width: "100%", display: "flex", justifyContent: "center", marginTop: "-10px" }}>
        <NavigationControls 
          onPrev={goPrev} onNext={goNext} rows={allLoadedRows} selectedIdx={globalSelectedIdx} 
          onSelect={(globalIdx) => {
            let count = 0;
            for (let i = 0; i < pages.length; i++) {
              const currentPageArr = pages[i];
              if (!currentPageArr) continue;
              const pageLen = pages[i].length;
              if (globalIdx < count + pageLen) {
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
          <ChromosomeIdeogram chr={row.Chrom} start={Number(row.Start)} end={Number(row.End)} refGenome={refGenome} height={80} chrHeight={900} chrWidth={20} />
        )}
      </div>

      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <div ref={metadataRef} style={{ width: `${BASE_WIDTH}px`, display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px", boxSizing: "border-box" }}>
          <MetadataDisplay titleRef={titleRef} row={row} selectedIndices={paginatedIndices} availableSamples={availableSamples} isExpanded={isMetadataExpanded} onToggle={toggleMetadataExpansion} forceExpand={isExporting} />
        </div>
      </div>

      <div style={{ 
        width: `${BASE_WIDTH - 90}px`, 
        margin: "0 auto 15px auto", 
        display: "flex", 
        justifyContent: "flex-end", // Pushes contents all the way to the right
        alignItems: "center",
        boxSizing: "border-box"
      }}>
        {viewMode !== "overview" && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: `${currentFontSize}px`, color: "#555" }}>
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)}
              style={paginationButtonStyle}
            >
              Prev 10
            </button>
            <span style={{ fontWeight: "500" }}>
              Page {currentPage} of {totalPages} <span style={{ color: "#777", fontWeight: "normal" }}>({selectedSampleIndices.length} samples)</span>
            </span>
            <button 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(p => p + 1)}
              style={paginationButtonStyle}
            >
              Next 10
            </button>
          </div>
        )}
      </div>
      
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={{ width: `${BASE_WIDTH - 90}px`, marginBottom: "-20px", paddingTop: "-20px", marginLeft: "-200px", display: "flex", flexDirection: "column" }}>
          <div style={controlsContainerStyle}>
            
            <div className="tab-buttons" style={{ display: "flex" }}>
              {isSingleSample ? (
                <button 
                  onClick={() => setViewMode("decomposition")} 
                  style={{ ...(viewMode !== "overview" ? activeTabStyle : inactiveTabStyle), fontSize: "inherit" }}
                >
                  Combined View
                </button>
              ) : (
                <>
                  <button onClick={() => setViewMode("decomposition")} style={{ ...(viewMode === "decomposition" ? activeTabStyle : inactiveTabStyle), fontSize: "inherit" }}>
                    Decomposition
                  </button>
                  <button onClick={() => setViewMode("methylation")} style={{ ...(viewMode === "methylation" ? activeTabStyle : inactiveTabStyle), fontSize: "inherit" }}>
                    Methylation
                  </button>
                </>
              )}
              <button onClick={() => setViewMode("overview")} style={{ ...(viewMode === "overview" ? activeTabStyle : inactiveTabStyle), fontSize: "inherit" }}>
                Overview 
              </button>
            </div>

            <div style={{ paddingBottom: "4px" }}> 
              <SamplePicker availableSamples={availableSamples} selectedIndices={selectedSampleIndices} onSelectionChange={setSelectedSampleIndices} baseFontSize={currentFontSize} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", width: "100%", overflowX: "auto", maxWidth: "1400px", margin: "0 auto", justifyContent: "center", gap: "24px", marginTop: 20, overflow: "visible" }}>
        
        <div ref={visualizerRef} style={{ width: `${BASE_WIDTH}px`, border: "1px solid #eee", borderRadius: "10px", background: "#fff", flexShrink: 0 }}>
          <VisualizerCanvas 
            data={row}
            viewMode={effectiveViewMode}
            selectedSamples={
              viewMode === "overview" 
                ? selectedSampleIndices.map(idx => availableSamples[idx]) 
                : paginatedIndices.map(idx => availableSamples[idx])
            }
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
            baseFontSize={currentFontSize} 
          />
        </div>

        <div ref={legendRef} style={{ flexShrink: 0, width: "max-content", visibility: viewMode === "overview" ? "hidden" : "visible" }}>
          <Legend 
            colorMap={getVisibleColorMap(row, paginatedIndices, availableSamples, colorMap)} 
            refMotif={row?.Motif}
            methPalette={settings.methPalette} 
            hasDecomposition={viewMode === "decomposition" || isSingleSample} 
            showMethylation={viewMode === "methylation" || isSingleSample}
            paletteSwatches={activePaletteSwatches}
            overrideColor={expectedMotifOverrideColor}
            onOverrideColorChange={setExpectedMotifOverrideColor}
            hasAmbiguousMeth={
              selectedSampleIndices.some(idx => {
                const sampleName = availableSamples[idx];
                return row.samples?.[row.samples && availableSamples[idx]]?.Meth_tag?.includes("-1");
              })
            }
            methThreshold={methThreshold}
            baseFontSize={currentFontSize}
          />
        </div>
      </div>
      
      {viewMode !== "overview" && (
        <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: "10px", paddingBottom: "40px" }}>
          <div style={{ width: `${BASE_WIDTH}px`, display: "flex", justifyContent: "space-between", alignItems: "center", boxSizing: "border-box" }}>
            <ZoomControls zoomFactor={zoomFactor} setZoomFactor={setZoomFactor} />
            <DownloadManager visualizerRef={visualizerRef} legendRef={legendRef} metadataRef={metadataRef} titleRef={titleRef} viewMode={viewMode} chrom={row.Chrom} start={row.Start} isExporting={isExporting} setIsExporting={setIsExporting} />
          </div>
        </div>
      )}
    </div>
  );
}

const activeTabStyle = { padding: "8px 16px", background: "#328547", color: "#fff", border: "1px solid #328547", borderBottom: "none", borderRadius: "4px 4px 0 0", cursor: "pointer", fontWeight: "bold" };
const inactiveTabStyle = { padding: "8px 16px", background: "#eee", color: "#333", border: "1px solid #999", borderBottom: "none", borderRadius: "4px 4px 0 0", cursor: "pointer", transition: "background 0.2s" };
const controlsContainerStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%", marginTop: "20px", borderBottom: "2px solid #328547" };
const paginationStyle = { display: "flex", justifyContent: "center", alignItems: "center", gap: "20px", marginBottom: "15px", fontSize: "13px", color: "#555" };

const paginationButtonStyle = {
  padding: "5px 12px",
  background: "#fff",
  border: "1px solid #ccc",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "inherit",
  fontWeight: "500",
  transition: "all 0.15s ease-in-out",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
};