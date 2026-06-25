import React from "react";
import DecompositionPlot from "../DecompositionPlot";
import MethylationPlot from "../MethylationPlot";
import OverviewDashboard from "../OverviewDashboard";
import Axis from "../Axis";

const safeJson = (s) => {
  if (!s) return null;
  try { return JSON.parse(s.replace(/'/g, '"')); } catch { return null; }
};

export default function VisualizerCanvas({ 
  data,               
  viewMode = "decomposition",           
  selectedSamples = [],    
  availableSamples = [],
  totalSvgWidth, 
  scaleX, 
  getMethylationColor, 
  colorMap, 
  margins,
  hoverX,
  onHoverX,
  loading,
  fullLen,
  baseFontSize = 13,
  currentFont = "Arial, sans-serif"
}) {

  if (viewMode === "overview") {
    return (
      <OverviewDashboard data={data} selectedSamples={selectedSamples} availableSamples={availableSamples} baseFontSize={baseFontSize}/>
    );
  }

  if (!data || !data.samples || Object.keys(data.samples).length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
          {loading ? "Fetching genomic data..." : "No sample data available for this locus."}
        </div>
      </div>
    );
  }

  const isDecomp = viewMode === "decomposition";
  const isCombined = viewMode === "combined";
  
  // Detect if a wider, monospaced font is currently active
  const isWideFont = currentFont.toLowerCase().includes("mono") || currentFont.toLowerCase().includes("courier");
  
  // DYNAMIC SCALING RATIOS
  const estimatedCharWidth = isWideFont ? baseFontSize * 0.78 : baseFontSize * 0.6;
  const leftMarginOffset = Math.max(margins.left, estimatedCharWidth * 9.5); 

  const TRACK_HEIGHT = baseFontSize * 2.2; 
  const TRACK_GAP = Math.max(10, baseFontSize * 0.75); 
  const TEXT_VERTICAL_OFFSET = (TRACK_HEIGHT / 2) + (baseFontSize * 0.35); 
  const SAMPLE_PADDING_BORDER = Math.max(45, baseFontSize * 3.0);
  
  const HEADER_TOP = Math.max(80, baseFontSize * 4.5); 
  const REF_HEIGHT = (isDecomp || isCombined) ? TRACK_HEIGHT + (baseFontSize * 2.0) : 0; 
  const AXIS_HEIGHT = Math.max(75, baseFontSize * 4.0);

  let totalSamplesHeight = 0;
  if (isCombined) {
    const singleSampleName = selectedSamples[0];
    const sample = data.samples[singleSampleName];
    const trackCount = sample?.parsedDecomp?.length || 2;
    
    const decompBlockHeight = (trackCount * TRACK_HEIGHT) + ((trackCount - 1) * TRACK_GAP) + (baseFontSize * 2.5); 
    const methBlockHeight = (trackCount * TRACK_HEIGHT) + ((trackCount - 1) * TRACK_GAP) + (baseFontSize * 2.5);
    totalSamplesHeight = decompBlockHeight + methBlockHeight + baseFontSize; 
  } else {
    selectedSamples.forEach((sampleName) => {
      const sample = data.samples[sampleName];
      const trackCount = sample?.parsedDecomp?.length || 2;
      
      const sampleLabelHeight = baseFontSize * 2.2; 
      const tracksAreaHeight = (trackCount * TRACK_HEIGHT) + ((trackCount - 1) * TRACK_GAP);
      const sampleBlockHeight = sampleLabelHeight + tracksAreaHeight + SAMPLE_PADDING_BORDER;
      
      totalSamplesHeight += sampleBlockHeight;
    });
  }

  const TOTAL_HEIGHT = HEADER_TOP + REF_HEIGHT + totalSamplesHeight + AXIS_HEIGHT;
  const globalRef = data.refTrack;
  let currentYTracker = HEADER_TOP + REF_HEIGHT;

  return (
    <div style={{ ...containerStyle, paddingBottom: "35px", fontFamily: currentFont }}>
      <svg 
        width={totalSvgWidth} 
        height={TOTAL_HEIGHT} 
        style={{ display: "block", overflow: "visible" }}
      >
        
        {hoverX !== null && (
          <line x1={hoverX} y1={0} x2={hoverX} y2={TOTAL_HEIGHT - AXIS_HEIGHT} stroke="#444" strokeWidth="1.5" strokeDasharray="4,2" opacity="0.4" pointerEvents="none" />
        )}
        
        {/* GLOBAL SAMPLE NAME LABEL */}
        {isCombined && selectedSamples[0] && (
          <text x={leftMarginOffset} y={25} style={{ fontWeight: "bold", fontSize: `${baseFontSize + 2}px`, fill: "#222", fontFamily: currentFont }}>
            {data.samples[selectedSamples[0]]?.SampleID || selectedSamples[0]}
          </text>
        )}

        {/* REFERENCE GENOME LANE */}
        {(isDecomp || isCombined) && globalRef && (
          <g transform={`translate(0, ${HEADER_TOP})`}>
            <DecompositionPlot
              decompRef={globalRef} decompA1={null} decompA2={null}
              alleleLenRef={(globalRef?.lengths || []).reduce((a, b) => a + b, 0)}
              scaleX={scaleX} leftMargin={leftMarginOffset} refMotif={data.Motif} colorMap={colorMap} yOffset={0} rowGap={0} 
              baseFontSize={baseFontSize} barHeight={TRACK_HEIGHT - 6}
            />
            <line x1={0} y1={REF_HEIGHT - 10} x2={totalSvgWidth} y2={REF_HEIGHT - 10} stroke="#2d5a27" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
          </g>
        )}

        {/* COMBINED SINGLE SAMPLE VIEW */}
        {isCombined ? (() => {
          const sampleName = selectedSamples[0];
          const sample = data.samples[sampleName];
          if (!sample) return null;

          const trackCount = sample.parsedDecomp?.length || 2;
          const methTags = safeJson(sample.Meth_tag) || [];
          const firstPos = methTags[0]?.[0]?.[0] || 0;
          const startOffset = (firstPos > 100000) ? Number(data.Start || 0) : 0;

          const decompPlotTracksHeight = (trackCount * TRACK_HEIGHT) + ((trackCount - 1) * TRACK_GAP);
          
          const yDecompHeader = currentYTracker + baseFontSize;
          const yDecompPlotStart = yDecompHeader + (baseFontSize * 1.5);
          
          const yMethHeader = yDecompPlotStart + decompPlotTracksHeight + (baseFontSize * 2.5);
          const yMethPlotStart = yMethHeader + (baseFontSize * 1.5);

          return (
            <g key={sampleName}>
              <text x={leftMarginOffset} y={yDecompHeader} style={{ fontWeight: "bold", fontSize: `${baseFontSize}px`, fill: "#333", fontFamily: currentFont }}>
                Decomposition
              </text>
              <g transform={`translate(0, ${yDecompPlotStart})`}>
                {sample.parsedDecomp.map((track, trackIdx) => {
                  const currentTrackY = trackIdx * (TRACK_HEIGHT + TRACK_GAP);
                  const calculatedLen = (track.lengths || []).reduce((a, b) => a + (Number(b) || 0), 0);
                  const displayLen = sample.trackLengths?.[trackIdx] || calculatedLen || 0;

                  return (
                    <g key={`decomp-${trackIdx}`} transform={`translate(0, ${currentTrackY})`}>
                      <text x={leftMarginOffset - 15} y={TEXT_VERTICAL_OFFSET} textAnchor="end" style={{ fontSize: `${baseFontSize}px`, fill: "#333", fontWeight: "500", fontFamily: currentFont }}>
                        Allele {trackIdx + 1}
                      </text>
                      <DecompositionPlot
                        decompRef={null} decompA1={track} decompA2={null} alleleLenRef={0} alleleLen1={displayLen} alleleLen2={0}
                        scaleX={scaleX} leftMargin={leftMarginOffset} colorMap={colorMap} refMotif={data.Motif} yOffset={0} rowGap={0}
                        baseFontSize={baseFontSize} barHeight={TRACK_HEIGHT - 6}
                      />
                    </g>
                  );
                })}
              </g>

              <text x={leftMarginOffset} y={yMethHeader} style={{ fontWeight: "bold", fontSize: `${baseFontSize}px`, fill: "#333", fontFamily: currentFont }}>
                Methylation
              </text>
              <g transform={`translate(0, ${yMethPlotStart})`}>
                {sample.parsedDecomp.map((track, trackIdx) => {
                  const currentTrackY = trackIdx * (TRACK_HEIGHT + TRACK_GAP);
                  const rawTrackMeth = methTags[trackIdx];
                  
                  let mTrack = { pos: [], lvl: [] };
                  if (rawTrackMeth && rawTrackMeth !== "NA" && Array.isArray(rawTrackMeth)) {
                    mTrack = {
                      pos: (rawTrackMeth[0] || []).flat().map(p => Number(p) - startOffset),
                      lvl: (rawTrackMeth[1] || []).flat().map(l => Number(l))
                    };
                  }
                  if ((safeJson(sample.Mean_meth) || [])[trackIdx] === "NA") {
                    mTrack = { pos: [], lvl: [] };
                  }

                  const lastCpGPos = mTrack.pos.length > 0 ? Math.max(...mTrack.pos) : 0;
                  const calculatedLen = (track.lengths || []).reduce((a, b) => a + (Number(b) || 0), 0);
                  const visualLen = Math.max(sample.trackLengths?.[trackIdx] || 0, lastCpGPos, calculatedLen);
                  const trackPixelWidth = Math.max(1, scaleX(visualLen) - scaleX(0));

                  return (
                    <g key={`meth-${trackIdx}`} transform={`translate(0, ${currentTrackY})`}>
                      <text x={leftMarginOffset - 15} y={TEXT_VERTICAL_OFFSET} textAnchor="end" style={{ fontSize: `${baseFontSize}px`, fill: "#333", fontWeight: "500", fontFamily: currentFont }}>
                        Allele {trackIdx + 1}
                      </text>
                      <MethylationPlot
                        meth1={mTrack} bgWidth1={trackPixelWidth} scaleX={scaleX} leftMargin={leftMarginOffset}
                        yStart={0} getColor={getMethylationColor} onHoverX={onHoverX} baseFontSize={baseFontSize}
                      />
                    </g>
                  );
                })}
              </g>
              <line x1={0} y1={TOTAL_HEIGHT - AXIS_HEIGHT - 5} x2={totalSvgWidth} y2={TOTAL_HEIGHT - AXIS_HEIGHT - 5} stroke="#eee" />
            </g>
          );
        })() : (
          selectedSamples.map((sampleName) => {
            const sample = data.samples[sampleName];
            if (!sample) return null;

            const yOffset = currentYTracker;
            const trackCount = sample.parsedDecomp?.length || 2;
            
            const sampleLabelHeight = baseFontSize * 2.2;
            const tracksAreaHeight = (trackCount * TRACK_HEIGHT) + ((trackCount - 1) * TRACK_GAP);
            const sampleBlockHeight = sampleLabelHeight + tracksAreaHeight + SAMPLE_PADDING_BORDER;
            currentYTracker += sampleBlockHeight;

            const methTags = safeJson(sample.Meth_tag) || [];
            const firstPos = methTags[0]?.[0]?.[0] || 0;
            const startOffset = (firstPos > 100000) ? Number(data.Start || 0) : 0;

            return (
              <g key={sampleName} transform={`translate(0, ${yOffset})`}>
                <text x={leftMarginOffset} y={baseFontSize * 1.4} style={{ fontWeight: "bold", fontSize: `${baseFontSize}px`, fill: "#333", fontFamily: currentFont }}>
                  {sample.SampleID}
                  {trackCount > 2 && <tspan fill="#666" fontWeight="normal" fontSize={`${baseFontSize - 2}px`}> ({trackCount} alleles detected)</tspan>}
                </text>

                {sample.parsedDecomp.map((track, trackIdx) => {
                  const currentTrackY = sampleLabelHeight + (trackIdx * (TRACK_HEIGHT + TRACK_GAP));
                  
                  if (isDecomp) {
                    const calculatedLen = (track.lengths || []).reduce((a, b) => a + (Number(b) || 0), 0);
                    const displayLen = sample.trackLengths?.[trackIdx] || calculatedLen || 0;

                    return (
                      <g key={trackIdx} transform={`translate(0, ${currentTrackY})`}>
                        <text x={leftMarginOffset - 15} y={TEXT_VERTICAL_OFFSET} textAnchor="end" style={{ fontSize: `${baseFontSize}px`, fill: "#333", fontFamily: currentFont }}>
                          Allele {trackIdx + 1}
                        </text>
                        <DecompositionPlot
                          decompRef={null} decompA1={track} decompA2={null} alleleLenRef={0} alleleLen1={displayLen} alleleLen2={0}
                          scaleX={scaleX} leftMargin={leftMarginOffset} colorMap={colorMap} refMotif={data.Motif} yOffset={0} rowGap={0}
                          baseFontSize={baseFontSize} barHeight={TRACK_HEIGHT - 6}
                        />
                      </g>
                    );
                  } else {
                    const rawTrackMeth = methTags[trackIdx];
                    let mTrack = { pos: [], lvl: [] };
                    if (rawTrackMeth && rawTrackMeth !== "NA" && Array.isArray(rawTrackMeth)) {
                      mTrack = {
                        pos: (rawTrackMeth[0] || []).flat().map(p => Number(p) - startOffset),
                        lvl: (rawTrackMeth[1] || []).flat().map(l => Number(l))
                      };
                    }
                    if ((safeJson(sample.Mean_meth) || [])[trackIdx] === "NA") {
                      mTrack = { pos: [], lvl: [] };
                    }

                    const lastCpGPos = mTrack.pos.length > 0 ? Math.max(...mTrack.pos) : 0;
                    const calculatedLen = (track.lengths || []).reduce((a, b) => a + (Number(b) || 0), 0);
                    const visualLen = Math.max(sample.trackLengths?.[trackIdx] || 0, lastCpGPos, calculatedLen);
                    const trackPixelWidth = Math.max(1, scaleX(visualLen) - scaleX(0));

                    return (
                      <g key={trackIdx} transform={`translate(0, ${currentTrackY})`}>
                        <text x={leftMarginOffset - 15} y={TEXT_VERTICAL_OFFSET} textAnchor="end" style={{ fontSize: `${baseFontSize}px`, fill: "#333", fontFamily: currentFont }}>
                          Allele {trackIdx + 1}
                        </text>
                        <MethylationPlot
                          meth1={mTrack} bgWidth1={trackPixelWidth} scaleX={scaleX} leftMargin={leftMarginOffset}
                          yStart={0} getColor={getMethylationColor} onHoverX={onHoverX} baseFontSize={baseFontSize}
                        />
                      </g>
                    );
                  }
                })}
                
                <line 
                  x1={0} 
                  y1={sampleBlockHeight - (SAMPLE_PADDING_BORDER / 2)} 
                  x2={totalSvgWidth} 
                  y2={sampleBlockHeight - (SAMPLE_PADDING_BORDER / 2)} 
                  stroke="#eee" 
                  strokeWidth="1.5"
                />
              </g>
            );
          })
        )}

        <g transform={`translate(0, ${TOTAL_HEIGHT - AXIS_HEIGHT + 15})`}>
          <Axis 
            scale={scaleX} 
            visibleRange={[0, fullLen]} 
            width={totalSvgWidth} 
            leftMargin={leftMarginOffset} 
            rightMargin={margins.right} 
            bottomY={20}
            baseFontSize={baseFontSize} 
          />
        </g>
      </svg>
    </div>
  );
}

const containerStyle = {
  width: "100%", display: "block", overflowX: "auto", overflowY: "hidden", 
  background: "#fff", borderRadius: 10, border: "1px solid #eee", boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.05)"
};