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
  fullLen
}) {

  if (viewMode === "overview") {
    return (
      <OverviewDashboard 
        data={data}
        selectedSamples={selectedSamples}
        availableSamples={availableSamples}
      />
    );
  }

  const isDecomp = viewMode === "decomposition";
  
  const TRACK_HEIGHT = isDecomp ? 25 : 30; // Individual sizing per allele track lane
  const TRACK_GAP = 8;
  const SAMPLE_PADDING_BORDER = 40; // Spacing for labels and dividers
  const REF_HEIGHT = isDecomp ? 60 : 0; 
  const HEADER_TOP = 40; 
  const AXIS_HEIGHT = 60;  

  // Compute exactly how many horizontal rows each individual selected sample contains
  const totalSamplesHeight = selectedSamples.reduce((accumulatedHeight, sIdx) => {
    const sample = data?.samples?.[sIdx];
    const trackCount = sample?.parsedDecomp?.length || 2; // Default fallback to 2 lines if loading
    const sampleBlockHeight = (trackCount * TRACK_HEIGHT) + ((trackCount - 1) * TRACK_GAP) + SAMPLE_PADDING_BORDER;
    return accumulatedHeight + sampleBlockHeight;
  }, 0);

  const TOTAL_HEIGHT = HEADER_TOP + REF_HEIGHT + totalSamplesHeight + AXIS_HEIGHT;

  if (!data || !data.samples || Object.keys(data.samples).length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
          {loading ? "Fetching genomic data..." : "No sample data available for this locus."}
        </div>
      </div>
    );
  }

  const globalRef = data.refTrack;
  
  // track vertical coordinates across multiple loop execution tracks dynamically
  let currentYTracker = HEADER_TOP + REF_HEIGHT;

  return (
    <div style={containerStyle}>
      <svg width={totalSvgWidth} height={TOTAL_HEIGHT}>
        
        {/* GLOBAL VERTICAL GUIDE LINE */}
        {hoverX !== null && (
          <line
            x1={hoverX}
            y1={0}
            x2={hoverX}
            y2={TOTAL_HEIGHT - AXIS_HEIGHT}
            stroke="#444"
            strokeWidth="1.5"
            strokeDasharray="4,2"
            opacity="0.4"
            pointerEvents="none"
          />
        )}
        
        {/* REFERENCE SECTION */}
        {isDecomp && (
          <g transform={`translate(0, ${HEADER_TOP})`}>
            <DecompositionPlot
              decompRef={globalRef} 
              decompA1={null} 
              decompA2={null}
              alleleLenRef={(globalRef?.lengths || []).reduce((a, b) => a + b, 0)}
              scaleX={scaleX}
              leftMargin={margins.left}
              refMotif={data.Motif}
              colorMap={colorMap}
              yOffset={0}
              rowGap={0}
            />
            <line x1={0} y1={40} x2={totalSvgWidth} y2={40} stroke="#2d5a27" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
          </g>
        )}

        {/* SAMPLES SECTION */}
        {selectedSamples.map((sIdx, i) => {
          const sample = data.samples[sIdx];
          const sampleName = availableSamples[sIdx] || `Index ${sIdx}`;
          
          // Capture the precise starting position for this block, then update the global tracker
          const yOffset = currentYTracker;
          const trackCount = sample?.parsedDecomp?.length || 2;
          const sampleBlockHeight = (trackCount * TRACK_HEIGHT) + ((trackCount - 1) * TRACK_GAP) + SAMPLE_PADDING_BORDER;
          currentYTracker += sampleBlockHeight;

          if (!sample) {
            return (
              <g key={sIdx} transform={`translate(0, ${yOffset})`}>
                <text x={margins.left} y={15} fill="#666" fontStyle="italic">
                  Loading data for {sampleName}...
                </text>
              </g>
            );
          }

          const methTags = safeJson(sample.Meth_tag) || [];
          const firstPos = methTags[0]?.[0]?.[0] || 0;
          const startOffset = (firstPos > 100000) ? Number(data.Start || 0) : 0;

          return (
            <g key={sIdx} transform={`translate(0, ${yOffset})`}>
              <text x={margins.left} y={12} style={{ fontWeight: "bold", fontSize: "12px", fill: "#444" }}>
                {sample.SampleID} 
                {trackCount > 2 &&(
                <tspan fill="#666" fontWeight="normal"> ({trackCount} alleles detected)</tspan>
                )}
              </text>

              {/* LOOP DYNAMICALLY THROUGH ALL VALID ALLELE TRACKS */}
              {sample.parsedDecomp.map((track, trackIdx) => {
                const currentTrackY = 25 + (trackIdx * (TRACK_HEIGHT + TRACK_GAP));
                
                if (isDecomp) {
                  const calculatedLen = (track.lengths || []).reduce((a, b) => a + (Number(b) || 0), 0);
                  const displayLen = sample.trackLengths?.[trackIdx] || calculatedLen || 0;

                  return (
                    <g key={trackIdx} transform={`translate(0, ${currentTrackY})`}>
                      <text x={margins.left - 15} y={14} textAnchor="end" style={{ fontSize: "14px", fill: "#333" }}>
                        Allele {trackIdx + 1}
                      </text>
                      <DecompositionPlot
                        decompRef={null}
                        decompA1={track} 
                        decompA2={null}  
                        alleleLenRef={0}
                        alleleLen1={displayLen}
                        alleleLen2={0}
                        scaleX={scaleX}
                        leftMargin={margins.left}
                        colorMap={colorMap}
                        refMotif={data.Motif}
                        yOffset={0}
                        rowGap={0}
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
                  // check if meanMeth explicitly flags this dynamic row lane position as "NA"
                  const meanMethArray = safeJson(sample.Mean_meth) || [];
                  if (meanMethArray[trackIdx] === "NA") {
                    mTrack = { pos: [], lvl: [] };
                  }

                  const lastCpGPos = mTrack.pos.length > 0 ? Math.max(...mTrack.pos) : 0;
                  const calculatedLen = (track.lengths || []).reduce((a, b) => a + (Number(b) || 0), 0);
                  const visualLen = Math.max(sample.trackLengths?.[trackIdx] || 0, lastCpGPos, calculatedLen);
                  
                  const startX = scaleX(0);
                  const trackPixelWidth = Math.max(1, scaleX(visualLen) - startX);

                  return (
                    <g key={trackIdx} transform={`translate(0, ${currentTrackY})`}>
                      <text x={margins.left - 15} y={12} textAnchor="end" style={{ fontSize: "14px", fill: "#333" }}>
                        Allele {trackIdx + 1}
                      </text>
                      <MethylationPlot
                        meth1={mTrack} 
                        bgWidth1={trackPixelWidth}
                        scaleX={scaleX}
                        leftMargin={margins.left}
                        yStart={0} 
                        getColor={getMethylationColor}
                        onHoverX={onHoverX}
                      />
                    </g>
                  );
                }
              })}
              
              
              <line x1={0} y1={sampleBlockHeight - 10} x2={totalSvgWidth} y2={sampleBlockHeight - 10} stroke="#eee" />
            </g>
          );
        })}

        <g transform={`translate(0, ${TOTAL_HEIGHT - AXIS_HEIGHT})`}>
          <Axis scale={scaleX} visibleRange={[0, fullLen]} width={totalSvgWidth}
            leftMargin={margins.left} rightMargin={margins.right} bottomY={20} />
        </g>
      </svg>
    </div>
  );
}


const containerStyle = {
  width: "100%", display: "block", overflowX: "auto", overflowY: "hidden", 
  background: "#fff", borderRadius: 10, border: "1px solid #eee", boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.05)"
};