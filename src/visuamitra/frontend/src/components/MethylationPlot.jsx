import React, { useState } from "react";

export default function MethylationPlot({
  meth1,
  meth2,
  bgWidth1,
  bgWidth2,
  alleleLen1 = 0,
  alleleLen2 = 0,
  scaleX,
  leftMargin,
  yStart = 200,
  rowGap = 40,
  getColor,
  onHoverX,
}) {
  const barHeight = 20;
  const MAGNIFY_SIZE = 7; // Expansion amount in pixels
  const [tooltip, setTooltip] = useState(null);

  /* CpG bars  */
  const drawCpGs = (positions = [], levels = [], baseY, alleleKey) => {
    // Create a "Zipped" and Filtered list to ensure coordinate integrity
    // This removes -2 values before they ever hit the .map()
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

  const titleY = 18;
  const y1 = yStart + 20;
  const y2 = y1 + barHeight + rowGap;
  const startX = scaleX(0);

  

  return (
    <>
      
      {/* Allele 1 */}
      <rect x={startX} y={y1} width={bgWidth1} height={barHeight} fill="rgba(200,200,200,0.25)" stroke="#AAA" strokeWidth={1} rx={4} />
      <text x={leftMargin - 95} y={y1 + barHeight / 1.5} fontSize="14" fontWeight="bold" fill="#222">Allele 1</text>
      {drawCpGs(meth1?.pos, meth1?.lvl, y1, "a1")}

      {/* Allele 2 */}
      <rect x={startX} y={y2} width={bgWidth2} height={barHeight} fill="rgba(200,200,200,0.25)" stroke="#AAA" strokeWidth={1} rx={4} />
      <text x={leftMargin - 95} y={y2 + barHeight / 1.5} fontSize="14" fontWeight="bold" fill="#222">Allele 2</text>
      {drawCpGs(meth2?.pos, meth2?.lvl, y2, "a2")}

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