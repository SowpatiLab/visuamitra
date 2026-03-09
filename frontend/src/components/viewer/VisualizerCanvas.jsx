import React from "react";
import DecompositionPlot from "../DecompositionPlot";
import MethylationPlot from "../MethylationPlot";
import Axis from "../Axis";

export default function VisualizerCanvas({ 
  totalSvgWidth, scaleX, decompData, methData, alleleLens, 
  getMethylationColor, colorMap, fullLen, margins 
}) {
  const DECOMP_HEIGHT = 160;
  const METH_HEIGHT = 170;
  const GAP = 20;
  const AXIS_HEIGHT = 50;
  const TOTAL_HEIGHT = 60 + DECOMP_HEIGHT + GAP + METH_HEIGHT + GAP + AXIS_HEIGHT;

  return (
    <div style={containerStyle}>
      <svg style={{ minWidth: totalSvgWidth }} height={TOTAL_HEIGHT}>
        <DecompositionPlot
          {...decompData}
          scaleX={scaleX}
          leftMargin={margins.left}
          colorMap={colorMap}
          yOffset={60}
          rowGap={25}
        />

        <foreignObject x="0" y={60 + DECOMP_HEIGHT + GAP} width={totalSvgWidth} height={METH_HEIGHT + 40}>
          <div style={{ width: totalSvgWidth, height: "100%" }}>
            <svg width={totalSvgWidth} height={METH_HEIGHT + 40}>
              <rect x={0} y={METH_HEIGHT} width={totalSvgWidth} height={40} fill="rgba(252,248,248,0.1)" />
              <MethylationPlot
                {...methData}
                alleleLen1={alleleLens.a1}
                alleleLen2={alleleLens.a2}
                scaleX={scaleX}
                leftMargin={margins.left}
                yStart={20}
                rowGap={25}
                getColor={getMethylationColor}
              />
              <Axis
                scale={scaleX}
                visibleRange={[0, fullLen]}
                width={totalSvgWidth}
                leftMargin={margins.left}
                rightMargin={margins.right}
                bottomY={METH_HEIGHT + 15}
              />
            </svg>
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}

const containerStyle = {
  width: 1200, display: "block", overflowX: "scroll", overflowY: "hidden", border: "1px solid #ccc",
  background: "#fafafa", whiteSpace: "nowrap", borderRadius: 10, boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.3)"
};