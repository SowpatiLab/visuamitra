import React from "react";
import { useState } from "react";
//import { getGradientColor } from "../utils/gradientColors";

export default function MethylationPlot({
  meth1,
  meth2,
  alleleLen1 = 0,
  alleleLen2 = 0,
  scaleX,
  leftMargin,
  yStart = 200,
  rowGap = 40,
  getColor,
}) {
  const barHeight = 28;

  const [tooltip, setTooltip] = useState(null);
  // tooltip = { x, y, text }

  /*  CpG bars  */
  const drawCpGs = (positions = [], levels = [], y) =>
    positions.map((pos, i) => {
      const x = scaleX(pos);
      const lvl = levels[i];

      if (lvl === -2) return null;

      const isAmbiguous = lvl === -1;

      return (
        <rect
          key={i}
          x={x - 3}
          y={y}
          width={6}
          height={barHeight}
          fill={isAmbiguous ? "none" : getColor(lvl)}   // ✅ gradient preserved
          stroke={isAmbiguous ? "#888" : "#555"}
          strokeWidth={0.8}
          onMouseEnter={
            isAmbiguous
              ? undefined
              : () =>
                  setTooltip({
                    x,
                    y,
                    text: ` ${lvl}%`,
                  })
          }
          onMouseLeave={
            isAmbiguous ? undefined : () => setTooltip(null)
          }
          style={{ cursor: "pointer" }}
        />
      );
    });

  /*  Layout  */
  const titleY = 18;
  const y1 = yStart + 20;
  const y2 = y1 + barHeight + rowGap;

  /*  Background bars  */
  const startX = leftMargin;

  const bgWidth1 = Math.max(
    1,
    scaleX(alleleLen1) - startX
    );

    const bgWidth2 = Math.max(
    1,
    scaleX(alleleLen2) - startX
    );
    
//console.log("Allele lens:", alleleLen1, alleleLen2);
//console.log("startX:", startX, "endX1:", scaleX(alleleLen1));


  return (
    <>
      {/*  Title  */}
      <text
        x={leftMargin}
        y={titleY}
        fontSize="18"
        fontWeight="bold"
        fill="#222"
      >
        Methylation
      </text>

      {/*  Allele 1  */}
      <rect
        x={startX}
        y={y1}
        width={bgWidth1}
        height={barHeight}
        fill="rgba(200,200,200,0.25)"
        stroke="#AAA"
        strokeWidth={1}
        rx={4}
      />
      <text
        x={leftMargin - 80}
        y={y1 + barHeight / 1.5}
        fontSize="14"
        fontWeight="bold"
        fill="#222"
      >
        Allele 1
      </text>
      {drawCpGs(meth1?.pos, meth1?.lvl, y1)}

      {/*  Allele 2  */}
      <rect
        x={startX}
        y={y2}
        width={bgWidth2}
        height={barHeight}
        fill="rgba(200,200,200,0.25)"
        stroke="#AAA"
        strokeWidth={1}
        rx={4}
      />
      <text
        x={leftMargin - 80}
        y={y2 + barHeight / 1.5}
        fontSize="14"
        fontWeight="bold"
        fill="#222"
      >
        Allele 2
      </text>
      {drawCpGs(meth2?.pos, meth2?.lvl, y2)}

      {tooltip && (
        <g pointerEvents="none">
          <rect
            x={tooltip.x - 50}
            y={tooltip.y - 26}
            width={100}
            height={20}
            rx={4}
            fill="rgba(255,255,255,0.95)"
            stroke="#bbb"
            strokeWidth={0.6}
          />
          <text
            x={tooltip.x}
            y={tooltip.y - 12}
            fill="#222"
            fontSize="11"
            fontWeight="600"
            textAnchor="middle"
          >
            {tooltip.text}
          </text>
        </g>
      )}

    </>
  );
}
