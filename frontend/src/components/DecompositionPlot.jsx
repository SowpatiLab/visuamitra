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
  const MAGNIFY_SIZE = 6; // How many pixels to expand
  const [hover, setHover] = useState(null);

  const renderMotifs = (data, baseY, trackLabel) => {
    const { motifs = [], lengths = [], copies = [] } = data || {};
    if (!lengths.length) return null;

    let currentOffset = 0;

    return lengths.map((len, i) => {
      const x1 = scaleX(currentOffset);
      const w = scaleX(currentOffset + len) - x1;
      const motifStart = currentOffset;
      currentOffset += len;

      const copy = copies[i];
      const isNonRepeating = copy == null || copy <= 1;
      const id = `${trackLabel}-${i}`;
      const isHovered = hover?.id === id;

      return (
        <rect
          key={id}
          // Magnification Logic: decrease x/y and increase width/height
          x={isHovered ? x1 - MAGNIFY_SIZE / 2 : x1}
          y={isHovered ? baseY - MAGNIFY_SIZE / 2 : baseY}
          width={isHovered ? w + MAGNIFY_SIZE : w}
          height={isHovered ? barHeight + MAGNIFY_SIZE : barHeight}
          fill={isNonRepeating ? "#bdbdbd" : colorMap[motifs[i]] || "#888"}
          stroke={isHovered ? "#000" : "#444"}
          strokeWidth={isHovered ? 2 : 1}
          rx={2}
          style={{ transition: "all 0.1s ease-out", cursor: "pointer" }}
          onMouseEnter={() =>
            setHover({
              id,
              x: x1 + w / 2,
              y: baseY - 12,
              motif: motifs[i],
              copy,
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

  return (
    <>
      <text x={leftMargin} y={yOffset - 15} fontSize="18" fontWeight="bold" fill="#222">Decomposition</text>

      <text x={leftMargin - 95} y={yRef + barHeight / 1.5} fontSize="14" fontWeight="bold">Ref. Allele</text>
      {renderMotifs(decompRef, yRef, "ref")}

      <text x={leftMargin - 95} y={yA1 + barHeight / 1.5} fontSize="14" fontWeight="bold">Allele 1</text>
      {renderMotifs(decompA1, yA1, "a1")}

      <text x={leftMargin - 95} y={yA2 + barHeight / 1.5} fontSize="14" fontWeight="bold">Allele 2</text>
      {renderMotifs(decompA2, yA2, "a2")}

      {/* Tooltip */}
      {hover && (
        <g pointerEvents="none">
          {/* Use foreignObject to allow dynamic HTML sizing */}
          <foreignObject
            x={hover.x - 75} // Initial centering attempt
            y={hover.y - 45} // Positioned above the motif
            width="150"      // Sufficient width for the text to flow
            height="40"
            style={{ overflow: "visible" }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "4px 10px",
                background: "white",
                border: "1px solid #d3d3d3ff",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "550",
                color: "#222",
                whiteSpace: "nowrap", // Prevents wrapping to keep the box tight
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                transform: "translateX(-50%)", // Perfect horizontal centering
                marginLeft: "75px" // Offsets the foreignObject starting X
              }}
            >
              {hover.isNonRepeating
                ? hover.motif
                : `${hover.motif} × ${hover.copy}`}
            </div>
          </foreignObject>
        </g>
      )}
    </>
  );
}