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
  totalSvgWidth, 
  scaleX, 
  getMethylationColor, 
  colorMap, 
  margins,
  hoverX,
  onHoverX
}) {
  const isDecomp = viewMode === "decomposition";
  
  // Minimal Change: Reduce height for samples since they only have 2 tracks now
  const SAMPLE_HEIGHT = isDecomp ? 100 : 130; 
  const REF_HEIGHT = isDecomp ? 60 : 0; 
  const HEADER_TOP = 40; 
  const AXIS_HEIGHT = 60;
  
  const TOTAL_HEIGHT = HEADER_TOP + REF_HEIGHT + (selectedSamples.length * SAMPLE_HEIGHT) + AXIS_HEIGHT;

  if (!data || !data.samples) return <div style={containerStyle}>No data available</div>;

  const sampleKeys = Object.keys(data.samples);
  const firstSampleForRef = data.samples[sampleKeys[0]];
  const { ref: globalRef } = parseDecompFromTSV(
    firstSampleForRef?.Decomp_info, 
    firstSampleForRef?.Decomp_seq
  ) || {};

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

        {/* 1. REFERENCE SECTION */}
        {isDecomp && (
          <g transform={`translate(0, ${HEADER_TOP})`}>
            <DecompositionPlot
              decompRef={globalRef} 
              decompA1={null} 
              decompA2={null}
              alleleLenRef={globalRef?.totalLen || 0}
              scaleX={scaleX}
              leftMargin={margins.left}
              colorMap={colorMap}
              yOffset={0}
              rowGap={0}
            />
            <line x1={0} y1={40} x2={totalSvgWidth} y2={40} stroke="#2d5a27" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
          </g>
        )}

        {/* 2. SAMPLES SECTION */}
        {selectedSamples.map((sIdx, i) => {
          let sample = data.samples[sIdx];
          if (!sample) {
            const availableKeys = Object.keys(data.samples);
            if (availableKeys.length > 0) sample = data.samples[availableKeys[0]];
          }
          if (!sample) return null;

          // Minimal Change: Dynamic yOffset calculation
          const yOffset = HEADER_TOP + REF_HEIGHT + (i * SAMPLE_HEIGHT);

          const { a1: dA1, a2: dA2 } = parseDecompFromTSV(sample.Decomp_info, sample.Decomp_seq) || {};
          const methTags = safeJson(sample.Meth_tag) || [];
          const m1 = { pos: methTags[0]?.[0] || [], lvl: methTags[0]?.[1] || [] };
          const m2 = { pos: methTags[1]?.[0] || [], lvl: methTags[1]?.[1] || [] };

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
                  yOffset={5} // Starts right under the text
                  rowGap={10}
                />
              ) : (
                <MethylationPlot
                  meth1={m1} meth2={m2}
                  alleleLen1={sample.alleleLen1 || dA1?.totalLen || 0}
                  alleleLen2={sample.alleleLen2 || dA2?.totalLen || 0}
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
          <Axis scale={scaleX} visibleRange={[0, data.maxAlleleLen]} width={totalSvgWidth}
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