import React, { useMemo } from "react";
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
  totalSvgWidth, 
  scaleX, 
  getMethylationColor, 
  colorMap, 
  margins 
}) {
  const ROW_HEIGHT = viewMode === "decomposition" ? 140 : 130;
  const AXIS_HEIGHT = 60;
  const HEADER_HEIGHT = 40;
  
  const TOTAL_HEIGHT = HEADER_HEIGHT + (selectedSamples.length * ROW_HEIGHT) + AXIS_HEIGHT;

  if (!data || !data.samples) return <div style={containerStyle}>No data available</div>;

  return (
    <div style={containerStyle}>
      <svg width={totalSvgWidth} height={TOTAL_HEIGHT}>
        {selectedSamples.map((sIdx, i) => {
          let sample = data.samples[sIdx];

          // FALLBACK: If index 0 is empty (common in merged VCFs), 
          // grab the first available sample in this specific locus 
          // so the user sees SOMETHING.
          if (!sample) {
            const availableKeys = Object.keys(data.samples);
            if (availableKeys.length > 0) {
              sample = data.samples[availableKeys[0]];
            }
          }
          if (!sample) return null;

          const yOffset = HEADER_HEIGHT + (i * ROW_HEIGHT);

          // --- LOCAL PARSING FOR THIS SAMPLE ---
          const { ref: dRef, a1: dA1, a2: dA2 } = parseDecompFromTSV(sample.Decomp_info, sample.Decomp_seq) || {};
          const methTags = safeJson(sample.Meth_tag) || [];
          const m1 = { pos: methTags[0]?.[0] || [], lvl: methTags[0]?.[1] || [] };
          const m2 = { pos: methTags[1]?.[0] || [], lvl: methTags[1]?.[1] || [] };

          return (
            <g key={sIdx} transform={`translate(0, ${yOffset})`}>
              <text x={margins.left} y={-10} style={{ fontWeight: "bold", fontSize: "14px", fill: "#333" }}>
                {sample.SampleID}
              </text>

              {viewMode === "decomposition" ? (
                <DecompositionPlot
                  decompRef={dRef} decompA1={dA1} decompA2={dA2}
                  alleleLenRef={sample.alleleLenRef || dRef?.totalLen || 0}
                  alleleLen1={sample.alleleLen1 || dA1?.totalLen || 0}
                  alleleLen2={sample.alleleLen2 || dA2?.totalLen || 0}                
                  scaleX={scaleX}
                  leftMargin={margins.left}
                  colorMap={colorMap}
                  yOffset={5}
                  rowGap={12}
                />
              ) : (
                <MethylationPlot
                  meth1={m1} meth2={m2}
                  alleleLen1={sample.alleleLen1}
                  alleleLen2={sample.alleleLen2}
                  scaleX={scaleX}
                  leftMargin={margins.left}
                  yStart={10}
                  rowGap={12}
                  getColor={getMethylationColor}
                />
              )}
              <line x1={0} y1={ROW_HEIGHT - 30} x2={totalSvgWidth} y2={ROW_HEIGHT - 30} stroke="#eee" />
            </g>
          );
        })}

        <g transform={`translate(0, ${TOTAL_HEIGHT - AXIS_HEIGHT})`}>
          <Axis scale={scaleX} visibleRange={[0, data.maxAlleleLen]} width={totalSvgWidth}
            leftMargin={margins.left} rightMargin={margins.right} bottomY={20} />
        </g>
      </svg>
    </div>
  );
}

const containerStyle = {
  width: "100%", 
  display: "block", 
  overflowX: "auto", 
  overflowY: "hidden", 
  background: "#fafafa", 
  borderRadius: 10, 
  border: "1px solid #ccc",
  boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)"
};