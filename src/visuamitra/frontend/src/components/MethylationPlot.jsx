import React, { useState } from "react";

export default function MethylationPlot({
  meth1,            // current single mTrack object { pos: [...], lvl: [...] }
  bgWidth1,
  scaleX,
  leftMargin,
  yStart = 0,
  getColor,
  onHoverX,
  alleleLabel = "",
  baseFontSize = 13
}) {
  const barHeight = 20;
  const MAGNIFY_SIZE = 7; // Expansion amount in pixels
  const [tooltip, setTooltip] = useState(null);

  /* CpG bars  */
  const drawCpGs = (positions = [], levels = [], baseY, alleleKey) => {
    // Filter out missing/null data and -2 codes
    const validData = (positions || [])
      .map((pos, i) => ({ pos, lvl: levels[i], originalIdx: i }))
      .filter(item => item.lvl !== -2 && item.lvl !== null && !isNaN(item.lvl));

    return validData.map(({ pos, lvl, originalIdx }) => {
      const x = scaleX(pos);
      const isAmbiguous = lvl === -1;
      const id = `${alleleKey}-${originalIdx}`;
      const isHovered = tooltip?.id === id;

      return (
        <rect
          key={id}
          x={isHovered ? x - 3 - MAGNIFY_SIZE / 2 : x - 3}
          y={isHovered ? baseY - MAGNIFY_SIZE / 2 : baseY}
          width={isHovered ? 6 + MAGNIFY_SIZE : 6}
          height={isHovered ? barHeight + MAGNIFY_SIZE : barHeight}
          fill={isAmbiguous ? "none" : getColor(lvl)}
          stroke={isHovered ? "#000" : (isAmbiguous ? "#888" : "#555")}
          strokeWidth={isHovered ? 1.5 : 0.8}
          style={{ cursor: "pointer", transition: "all 0.1s ease-out" }}
          onMouseEnter={() => {
            const safeLvl = (typeof lvl === 'number' && !isNaN(lvl)) ? `${lvl}%` : "N/A";
            setTooltip({
              id,
              x,
              y: baseY,
              text: isAmbiguous ? "Ambiguous" : safeLvl,
            });
            if (onHoverX) onHoverX(x);
          }}
          onMouseLeave={() => {
            setTooltip(null);
            if (onHoverX) onHoverX(null);
          }}
        />
      );
    });
  };

  const startX = scaleX(0);
  const y1 = yStart; // Directly utilize the native lane baseline

  // Fallback to safely verify coordinate arrays exist before trying to draw CpG sites
  const positions = meth1?.pos || [];
  const levels = meth1?.lvl || [];

  return (
    <>
      {/* Background Track Container*/}
      <rect 
        x={startX} 
        y={y1} 
        width={bgWidth1 > 0 ? bgWidth1 : 100} 
        height={barHeight} 
        fill="rgba(200,200,200,0.25)" 
        stroke="#AAA" 
        strokeWidth={1} 
        rx={4} 
      />
      
      {alleleLabel && (
        <text 
          x={leftMargin - 15} 
          y={y1 + (barHeight * 0.72)} 
          textAnchor="end" 
          style={{ fontSize: `${baseFontSize}px`, fontWeight: "bold", fill: "#222" }}
        >
          {alleleLabel}
        </text>
      )}

      {/* CpG Sites */}
      {positions.length > 0 && drawCpGs(positions, levels, y1, "single-allele")}

      {/* Dynamic Tooltip */}
      {tooltip && (
        <g pointerEvents="none">
          <foreignObject
            x={tooltip.x - 10} 
            y={tooltip.y - 25} 
            width="100" 
            height="30"
            style={{ overflow: "visible" }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "2px 8px",
                background: "white",
                border: "1px solid #d3d3d3ff",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: "550",
                color: "#222",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                transform: "translateX(-50%)",
                marginLeft: "50px"
              }}
            >
              {tooltip.text}
            </div>
          </foreignObject>
        </g>
      )}
    </>
  );
}