import React, { useState } from "react";
import { getCanonicalMotif } from "../utils/colorUtils";

export default function DecompositionPlot({
  decompRef,
  decompA1, // represents active track lane to render (Ref, A1, A2, A3, etc.)
  alleleLenRef = 0,
  alleleLen1 = 0,
  scaleX,
  leftMargin,
  colorMap,
  yOffset = 0,
  refMotif,
}) {
  const barHeight = 20;
  const MAGNIFY_SIZE = 6;
  const [hover, setHover] = useState(null);

  const renderMotifs = (data, baseY, trackLabel, totalLen) => {
    const hasData = data && data.lengths && data.lengths.length > 0;
    const sumOfSegments = hasData ? data.lengths.reduce((a, b) => a + b, 0) : 0;
    const visualTotal = hasData ? sumOfSegments : totalLen;

    const startX = scaleX(0);
    const endX = scaleX(visualTotal);
    const containerWidth = Math.max(0, endX - startX);

    return (
      <g>
        {/* Background Bar */}
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

        {/* Motif Segments */}
        {hasData && data.lengths.map((len, i) => {
          const currentOffset = data.lengths.slice(0, i).reduce((a, b) => a + b, 0);
          const x1 = scaleX(currentOffset);
          const w = scaleX(currentOffset + len) - x1;
          const id = `${trackLabel}-${i}`;
          const isHovered = hover?.id === id;
          const rawMotif = (data.motifs[i] || "").toUpperCase();
          const currentCopies = data.copies[i] || 0;
          const isNonRepetitive = currentCopies <= 1 || rawMotif.includes("N_REPETITIVE") || rawMotif.includes("FLANK");
          // BYPASS CYCLIC VARIATION
          const lookupKey = isNonRepetitive ? rawMotif : getCanonicalMotif(rawMotif, refMotif);
          const isKnown = !!colorMap[lookupKey];  
          const fillColor = isKnown ? colorMap[lookupKey] : "#bdbdbd";

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

              setHover({
                id,
                x: x1 + w / 2,
                y: baseY - 12,
                motif: rawMotif,
                copy: currentCopies, 
                len: len,
                isNonRepeating: isNonRepetitive,
              });
            }}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </g>
    );
  };

  return (
    <>
      {/* Reference Track */}
      {decompRef && (
        <g>
          <text x={leftMargin - 95} y={yOffset + barHeight / 1.5} fontSize="14" fontWeight="bold">
            Ref. Allele
          </text>
          {renderMotifs(decompRef, yOffset, "ref", alleleLenRef)}
        </g>
      )}

      {/* Dynamic Alleles Track */}
      {decompA1 && !decompRef && (
        <g>
          {renderMotifs(decompA1, yOffset, "allele-lane", alleleLen1)}
        </g>
      )}

      {/* Shared Tooltip */}
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