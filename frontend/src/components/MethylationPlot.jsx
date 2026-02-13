import React from "react";
import { getGradientColor } from "../utils/gradientColors";

export default function MethylationPlot({
  meth1,
  meth2,
  alleleLen1 = 0,
  alleleLen2 = 0,
  scaleX,
  leftMargin,
  yStart = 200,
  rowGap = 40,
}) {
  const barHeight = 28;

  /*  CpG bars  */
  const drawCpGs = (positions = [], levels = [], y) =>
    positions.map((pos, i) => {

      const x = scaleX(pos);

      const lvl = levels[i];
      
      if (lvl === -1) {
        return (
          <rect
            key={i}
            x={x - 3}
            y={y}
            width={6}
            height={barHeight}
            fill="none"
            stroke="#888"
            strokeWidth={0.8}
          />
        );
      }

      if (lvl === -2) return null

      return (
        <rect
          key={i}
          x={x - 3}
          y={y}
          width={6}
          height={barHeight}
          fill={getGradientColor(levels[i])} // expects 0–100
          stroke="#555"
          strokeWidth={0.8}
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
    
console.log("Allele lens:", alleleLen1, alleleLen2);
console.log("startX:", startX, "endX1:", scaleX(alleleLen1));

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
    </>
  );
}
