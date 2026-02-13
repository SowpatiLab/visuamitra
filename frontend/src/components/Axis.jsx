import React from "react";

/* Pick a nice step that is a multiple of 10 or100 */
function niceStep(max) {
  const targetDivs = 7; // ~number of major divisions
  const raw = max / targetDivs;
  const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));

  const candidates = [10, 20, 25, 50, 100].map((m) => m * pow10 / 10);

  return candidates.find((c) => raw <= c) || candidates[candidates.length - 1];
}

export default function Axis({
  scale,
  alleleMax,
  width,
  leftMargin,
  rightMargin,
  bottomY,
  label,
}) {
  if (!alleleMax || alleleMax <= 0) return null;

  const step = niceStep(alleleMax);

  const ticks = [];
  const lastFullTick = Math.floor(alleleMax / step) * step;

  // All multiples of step
  for (let v = 0; v <= lastFullTick; v += step) {
    ticks.push(v);
  }

  if (ticks[ticks.length - 1] !== alleleMax) {
    ticks.push(alleleMax);
  }

  return (
    <>
      {/* Axis baseline */}
      <line
        x1={leftMargin}
        y1={bottomY}
        x2={width - rightMargin}
        y2={bottomY}
        stroke="#444"
      />

      {/* Ticks */}
      {ticks.map((val, i) => {
        const x = scale(val);
        return (
          <g key={i}>
            <line
              x1={x}
              y1={bottomY}
              x2={x}
              y2={bottomY - 10}
              stroke="#444"
            />
            <text
              x={x}
              y={bottomY + 15}
              fontSize="12"
              textAnchor="middle"
              fill="#444"
            >
              {Math.round(val)}
            </text>
          </g>
        );
      })}

       {/* Optional axis label */}
      {label && (
        <text
          x={(leftMargin + width - rightMargin) / 2}
          y={bottomY + 32}
          fontSize="13"
          textAnchor="middle"
          fill="#444"
        >
          {label}
        </text>
      )}
    </>
  );
}
