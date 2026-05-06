import React from "react";
import DecompositionPlot from "../DecompositionPlot";
import MethylationPlot from "../MethylationPlot";
import Axis from "../Axis";
import { parseDecompFromTSV } from "../../utils/parseDecompInfo";

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
  const isDecomp = viewMode === "decomposition";
  const SAMPLE_HEIGHT = isDecomp ? 100 : 130; 
  const REF_HEIGHT = isDecomp ? 60 : 0; 
  const HEADER_TOP = 40; 
  const AXIS_HEIGHT = 60;  
  const TOTAL_HEIGHT = HEADER_TOP + REF_HEIGHT + (selectedSamples.length * SAMPLE_HEIGHT) + AXIS_HEIGHT;

  // CHECK: If data doesn't exist yet, return a skeleton or null
  if (!data || !data.samples || Object.keys(data.samples).length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{ padding: 40, textAlign: "center", color: "#666" }}>
          {loading ? "Fetching genomic data..." : "No sample data available for this locus."}
        </div>
      </div>
    );
  }

  const sampleKeys = Object.keys(data.samples);
  const globalRef = data.refTrack;
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
          const yOffset = HEADER_TOP + REF_HEIGHT + (i * SAMPLE_HEIGHT);

          if (!sample && loading) {
          return (
            <g key={sIdx} transform={`translate(0, ${yOffset})`}>
              <text x={margins.left} y={15} fill="#666" fontStyle="italic">
                Loading data for {sampleName}...
              </text>
            </g>
          );
        }

          // DATA MISSING HANDLER: Render a labeled placeholder instead of skipping
          if (!sample) {
            return (
              <g key={sIdx} transform={`translate(0, ${yOffset})`}>
                <text x={margins.left} y={-5} style={{ fontWeight: "bold", fontSize: "12px", fill: "#d93025" }}>
                  {sampleName} (Data not available for this sample)
                </text>
                <rect 
                  x={margins.left} y={10} 
                  width={totalSvgWidth - margins.left - margins.right} height={20} 
                  fill="#f9f9f9" stroke="#ddd" strokeDasharray="4,4" rx={4}
                />
                <line x1={0} y1={SAMPLE_HEIGHT - 20} x2={totalSvgWidth} y2={SAMPLE_HEIGHT - 20} stroke="#eee" />
              </g>
            );
          }
          // Parse Decomposition
          const dA1 = sample.parsedDecomp?.[1]; 
          const dA2 = sample.parsedDecomp?.[2];

          // Sum lengths using a helper to prevent NaN and leakage
          const sumLengths = (arr) => (arr || []).reduce((a, b) => a + (Number(b) || 0), 0);
          const decompLen1 = sumLengths(dA1.lengths);
          const decompLen2 = sumLengths(dA2.lengths);
          const methTags = safeJson(sample.Meth_tag) || [];

          // Check the first position to decide if we need to subtract startOffset
          const firstPos = methTags[0]?.[0]?.[0] || 0;
          const startOffset = (firstPos > 100000) ? Number(data.Start || 0) : 0; 

          const m1 = { 
            pos: (methTags[0]?.[0] || []).flat().map(p => Number(p) - startOffset), 
            // REMOVE the check that turns things into -1, Keep the raw value.
            lvl: (methTags[0]?.[1] || []).flat().map(l => Number(l))    
          };

          const m2 = { 
            pos: (methTags[1]?.[0] || []).flat().map(p => Number(p) - startOffset), 
            lvl: (methTags[1]?.[1] || []).flat().map(l => Number(l))
          };

          const lastCpGPos1 = Math.max(...(m1.pos || [0]));
          const lastCpGPos2 = Math.max(...(m2.pos || [0]));

          // Ensuring Allele 2 ONLY looks at Allele 2 data (index [2] and alleleLen2)
          const visualLen1 = Math.max(Number(sample.alleleLen1 || 0), lastCpGPos1, decompLen1);
          const visualLen2 = Math.max(Number(sample.alleleLen2 || 0), lastCpGPos2, decompLen2);

          // Calculate pixel widths manually to verify independence
          const startX = scaleX(0);
          const width1 = Math.max(1, scaleX(visualLen1) - startX);
          const width2 = Math.max(1, scaleX(visualLen2) - startX);

          console.log(`[Width Debug] ${sample.SampleID}: A1=${visualLen1} (${width1}px), A2=${visualLen2} (${width2}px)`);   
          console.log(`--- Data Debug: ${sample.SampleID} ---`);
          console.log("Positions (A1):", m1.pos);
          console.log("Levels (A1):", m1.lvl);
          console.log("Lengths match?", m1.pos.length === m1.lvl.length);

          // If lengths don't match, the 'N/A' is happening because 
          // there is no level at index 'i' for position 'pos'

          return (
            <g key={sIdx} transform={`translate(0, ${yOffset})`}>
              <text x={margins.left} y={-5} style={{ fontWeight: "bold", fontSize: "12px", fill: "#444" }}>
                {sample.SampleID}
              </text>

              {isDecomp ? (
                <DecompositionPlot
                  decompRef={null} 
                  decompA1={dA1} 
                  decompA2={dA2}
                  alleleLenRef={0}
                  alleleLen1={sample.alleleLen1 || dA1?.totalLen || 0}
                  alleleLen2={sample.alleleLen2 || dA2?.totalLen || 0}                
                  scaleX={scaleX}
                  leftMargin={margins.left}
                  colorMap={colorMap}
                  refMotif={data.Motif}
                  yOffset={5} 
                  rowGap={10}
                />
              ) : (
                <MethylationPlot
                  meth1={m1} meth2={m2}
                  alleleLen1={visualLen1}
                  alleleLen2={visualLen2}
                  bgWidth1={width1}
                  bgWidth2={width2}
                  scaleX={scaleX}
                  leftMargin={margins.left}
                  yStart={10}
                  rowGap={12}
                  getColor={getMethylationColor}
                  onHoverX={onHoverX}
                />
              )}
              <line x1={0} y1={SAMPLE_HEIGHT - 20} x2={totalSvgWidth} y2={SAMPLE_HEIGHT - 20} stroke="#eee" />
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