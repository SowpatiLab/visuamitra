import React, { useState } from "react";

export default function DecompositionPlot({
  decompRef,
  decompA1,
  decompA2,
  alleleLenRef = 0,
  alleleLen1 = 0,
  alleleLen2 = 0,
  scaleX,
  leftMargin,
  colorMap,
  yOffset = 60,
  rowGap = 14,
}) {
  const barHeight = 20;
  const MAGNIFY_SIZE = 6;
  const [hover, setHover] = useState(null);

  const renderMotifs = (data, baseY, trackLabel, totalLen) => {
    const { motifs = [], lengths = [], copies = [] } = data || {};
    
    // Calculate the actual visual sum of segments
    const sumOfSegments = lengths.reduce((a, b) => a + b, 0);
    // Use the larger of the two to ensure the grey bar covers everything
    const visualTotal = Math.max(totalLen, sumOfSegments);

    const startX = scaleX(0);
    const endX = scaleX(visualTotal);
    const fullBarWidth = Math.max(0, endX - startX);

    return (
      <g>
        {/* Background Bar */}
        <rect
          x={startX}
          y={baseY}
          width={fullBarWidth}
          height={barHeight}
          fill="rgba(200,200,200,0.25)"
          stroke="#AAA"
          strokeWidth={1}
          rx={4}
          onMouseEnter={() =>
            setHover({
              id: `${trackLabel}-total`,
              x: startX + fullBarWidth / 2,
              y: baseY - 12,
              motif: `Total Allele: ${visualTotal} bp`, // This is the 123/125 label
              isNonRepeating: true,
            })
          }
          onMouseLeave={() => setHover(null)}
        />

        {lengths.map((len, i) => {
          const currentOffset = lengths.slice(0, i).reduce((a, b) => a + b, 0);
          const x1 = scaleX(currentOffset);
          const w = scaleX(currentOffset + len) - x1; // Width based on actual bp length
          
          const id = `${trackLabel}-${i}`;
          const isHovered = hover?.id === id;

          return (
            <rect
              key={id}
              x={isHovered ? x1 - MAGNIFY_SIZE / 2 : x1}
              y={isHovered ? baseY - MAGNIFY_SIZE / 2 : baseY}
              width={isHovered ? Math.max(0, w + MAGNIFY_SIZE) : Math.max(0, w)}
              height={isHovered ? barHeight + MAGNIFY_SIZE : barHeight}
              fill={copies[i] <= 1 ? "#bdbdbd" : colorMap[motifs[i]] || "#888"}
              stroke={isHovered ? "#000" : "#444"}
              strokeWidth={isHovered ? 2 : 1}
              rx={2}
              onMouseEnter={(e) => {
                e.stopPropagation(); // CRITICAL: Prevents background bar from overriding
                setHover({
                  id,
                  x: x1 + w / 2,
                  y: baseY - 12,
                  motif: motifs[i],
                  copy: copies[i],
                  len: len,
                  isNonRepeating: copies[i] <= 1,
                });
              }}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </g>
    );
  };

  const yRef = yOffset;
  const yA1 = yOffset + barHeight + rowGap;
  const yA2 = yOffset + 2 * (barHeight + rowGap);

  return (
    <>
      

      <text x={leftMargin - 95} y={yRef + barHeight / 1.5} fontSize="14" fontWeight="bold">Ref. Allele</text>
      {renderMotifs(decompRef, yRef, "ref", alleleLenRef)}

      <text x={leftMargin - 95} y={yA1 + barHeight / 1.5} fontSize="14" fontWeight="bold">Allele 1</text>
      {renderMotifs(decompA1, yA1, "a1", alleleLen1)}

      <text x={leftMargin - 95} y={yA2 + barHeight / 1.5} fontSize="14" fontWeight="bold">Allele 2</text>
      {renderMotifs(decompA2, yA2, "a2", alleleLen2)}

      {/* Tooltip implementation */}
      {hover && (
        <g pointerEvents="none">
          <foreignObject x={hover.x - 75} y={hover.y - 65} width="150" height="60" style={{ overflow: "visible" }}>
            <div style={{
              display: "inline-block", padding: "6px 12px", background: "#f8f9fa",
              border: "1px solid #666", borderRadius: "4px", fontSize: "12px",
              fontWeight: "600", color: "#222", whiteSpace: "nowrap",
              boxShadow: "0 4px 8px rgba(0,0,0,0.15)", transform: "translateX(-50%)", marginLeft: "75px"
            }}>
              {/* Logic to differentiate between Total Bar and Specific Motif */}
              {hover.id.includes('-total') ? (
                <span>{hover.motif}</span>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ borderBottom: "1px solid #ddd", marginBottom: "2px", width: "100%", textAlign: "center" }}>
                    {hover.motif} {hover.copy > 1 ? `× ${hover.copy}` : ""}
                  </span>
                  <span style={{ fontSize: "11px", color: "#444" }}>
                    {hover.len} bp
                  </span>
                </div>
              )}
            </div>
          </foreignObject>
        </g>
      )}
    </>
  );
}