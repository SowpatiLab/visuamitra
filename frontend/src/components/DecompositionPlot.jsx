import React, { useState } from "react";

export default function DecompositionPlot({
  decompRef,
  decompA1,
  decompA2,
  scaleX,
  leftMargin,
  colorMap,
  yOffset = 60,
  rowGap = 28,
}) {
  const barHeight = 28;
  const [hover, setHover] = useState(null);

  const plotOne = (data, y) => {
    const motifs = data?.motifs || [];
    const lengths = data?.lengths || [];
    const copies = data?.copies || [];

    if (!lengths.length) {
      return (
        <text x={leftMargin} y={y + barHeight / 2} fill="#888">
          No decomposition available
        </text>
      );
    }

    let offset = 0;

    return lengths.map((len, i) => {
      const x1 = scaleX(offset);
      const w = scaleX(offset + len) - x1;
      offset += len;

      const copy = copies[i];
      const isNonRepeating = copy == null || copy <= 1;

      return (
        <rect
          key={`${y}-${i}`}
          x={x1}
          y={y}
          width={w}
          height={barHeight}
          fill={isNonRepeating ? "#bdbdbd" : colorMap[motifs[i]] || "#888"}
          stroke="#444"
          strokeWidth={1}
          rx={2}
          onMouseEnter={() =>
            setHover({
              x: x1 + w / 2,
              y: y - 8,
              motif: motifs[i],
              copy: copy,
              isNonRepeating,
            })
          }
          onMouseLeave={() => setHover(null)}
        />
      );
    });
  };

  const yRef = yOffset;
  const yA1 = yOffset + barHeight + rowGap;
  const yA2 = yOffset + 2 * (barHeight + rowGap);
  const titleY = yOffset - 10;

  return (
    <>
      {/* Title */}
      <text
        x={leftMargin}
        y={titleY}
        fontSize="18"
        fontWeight="bold"
        fill="#222"
      >
        Decomposition
      </text>

      {/* Reference */}
      <text x={leftMargin - 90} y={yRef + barHeight / 1.5} fontSize="14" fontWeight="bold">
        Reference
      </text>
      {plotOne(decompRef, yRef)}

      {/* Allele 1 */}
      <text x={leftMargin - 90} y={yA1 + barHeight / 1.5} fontSize="14" fontWeight="bold">
        Allele 1
      </text>
      {plotOne(decompA1, yA1)}

      {/* Allele 2 */}
      <text x={leftMargin - 90} y={yA2 + barHeight / 1.5} fontSize="14" fontWeight="bold">
        Allele 2
      </text>
      {plotOne(decompA2, yA2)}

      {/* Tooltip */}
      {hover && (
        <g pointerEvents="none">
          <rect
            x={hover.x - 80}
            y={hover.y - 28}
            width={160}
            height={26}
            rx={4}
            fill="white"
            stroke="#444"
          />
          <text
            x={hover.x}
            y={hover.y - 10}
            textAnchor="middle"
            fontSize="12"
            fill="#222"
          >
            {hover.isNonRepeating
              ?  hover.motif
              : `${hover.motif} × ${hover.copy}`}
          </text>
        </g>
      )}

    </>
  );
}
