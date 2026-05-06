import React, { useState } from "react";
import { getCanonicalMotif } from "../utils/colorUtils";

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
  refMotif,
}) {
  const barHeight = 20;
  const MAGNIFY_SIZE = 6;
  const [hover, setHover] = useState(null);

  const renderMotifs = (data, baseY, trackLabel, totalLen) => {
    // 1. Check if we actually have motif data
    const hasData = data && data.lengths && data.lengths.length > 0;
    
    // 2. Determine the width of our "container"
    // If no data: use the full reported allele length (fallback)
    // If data exists: use the sum of segments (no "ghost" tail)
    const sumOfSegments = hasData ? data.lengths.reduce((a, b) => a + b, 0) : 0;
    const visualTotal = hasData ? sumOfSegments : totalLen;

    const startX = scaleX(0);
    const endX = scaleX(visualTotal);
    const containerWidth = Math.max(0, endX - startX);

    return (
      <g>
        {/* Background Bar: Only acts as a placeholder when segments are missing */}
        <rect
          x={startX}
          y={baseY}
          width={containerWidth}
          height={barHeight}
          fill="rgba(200,200,200,0.25)"
          stroke="#AAA"
          strokeWidth={1}
          rx={4}
          onMouseEnter={() =>
            setHover({
              id: `${trackLabel}-total`,
              x: startX + containerWidth / 2,
              y: baseY - 12,
              motif: hasData ? `Total Data: ${sumOfSegments} bp` : `Estimated: ${totalLen} bp`,
              isNonRepeating: true,
            })
          }
          onMouseLeave={() => setHover(null)}
        />

        {/* Motif Segments: Only render if data exists */}
        {hasData && data.lengths.map((len, i) => {
          const currentOffset = data.lengths.slice(0, i).reduce((a, b) => a + b, 0);
          const x1 = scaleX(currentOffset);
          const w = scaleX(currentOffset + len) - x1;
          
          const id = `${trackLabel}-${i}`;
          const isHovered = hover?.id === id;
          const canonical = getCanonicalMotif(data.motifs[i] || "", refMotif);
          //const isMainMotif = canonical === (refMotif || "").toUpperCase();
          const isKnown = !!colorMap[canonical];  
          const fillColor = isKnown ? colorMap[canonical] : "#bdbdbd";

          return (
            <rect
              key={id}
              x={isHovered ? x1 - MAGNIFY_SIZE / 2 : x1}
              y={isHovered ? baseY - MAGNIFY_SIZE / 2 : baseY}
              width={isHovered ? Math.max(0, w + MAGNIFY_SIZE) : Math.max(0, w)}
              height={isHovered ? barHeight + MAGNIFY_SIZE : barHeight}
              fill={fillColor}
              stroke={isHovered ? "#000" : "#444"}
              strokeWidth={isHovered ? 2 : 1}
              rx={2}
              onMouseEnter={(e) => {
              e.stopPropagation();
              const rawMotif = (data.motifs[i] || "").toUpperCase();
              const canonical = getCanonicalMotif(data.motifs[i] || "", refMotif);

              setHover({
                id,
                x: x1 + w / 2,
                y: baseY - 12,
                motif: rawMotif,
                // Use the parsed copies and lengths directly for perfect sync
                copy: data.copies[i], 
                len: len,
                isNonRepeating: data.copies[i] <= 1,
              });
            }}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </g>
    );
  };

  // Dynamic Y positions: 
  // If decompRef is missing, yA1 moves to the top (yOffset).
  const yRef = yOffset;
  const yA1 = decompRef ? (yOffset + barHeight + rowGap) : yOffset;
  const yA2 = decompRef 
    ? (yOffset + 2 * (barHeight + rowGap)) 
    : (yOffset + barHeight + rowGap);
    
  return (
    <>
      {/* Reference Track */}
      {decompRef && (
        <g>
          <text x={leftMargin - 95} y={yRef + barHeight / 1.5} fontSize="14" fontWeight="bold">Ref. Allele</text>
          {renderMotifs(decompRef, yRef, "ref", alleleLenRef)}
        </g>
      )}

      {/* Allele 1 Track */}
      {decompA1 && (
        <g>
          <text x={leftMargin - 95} y={yA1 + barHeight / 1.5} fontSize="14" fontWeight="bold">Allele 1</text>
          {renderMotifs(decompA1, yA1, "a1", alleleLen1)}
        </g>
      )}

      {/* Allele 2 Track */}
      {decompA2 && (
        <g>
          <text x={leftMargin - 95} y={yA2 + barHeight / 1.5} fontSize="14" fontWeight="bold">Allele 2</text>
          {renderMotifs(decompA2, yA2, "a2", alleleLen2)}
        </g>
      )}

      {/* Tooltip */}
      {hover && (
        <g pointerEvents="none">
          <foreignObject x={hover.x - 75} y={hover.y - 30} width="150" height="60" style={{ overflow: "visible" }}>
            <div style={{
              display: "inline-block", padding: "6px 12px", background: "#f8f9fa",
              border: "1px solid #666", borderRadius: "4px", fontSize: "12px",
              fontWeight: "600", color: "#222", whiteSpace: "nowrap",
              boxShadow: "0 4px 8px rgba(0,0,0,0.15)", transform: "translateX(-50%)", marginLeft: "75px"
            }}>
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