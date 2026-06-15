import React from "react";

function niceStep(max) {
  const targetDivs = 7;
  const raw = max / targetDivs;
  const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [10, 20, 25, 50, 100].map((m) => (m * pow10) / 10);
  return candidates.find((c) => raw <= c) || candidates[candidates.length - 1];
}

function getTickStep(min, max, pixelWidth, targetPx = 70) {
  const span = max - min;
  const approxCount = Math.max(1, Math.floor(pixelWidth / targetPx));
  const raw = span / approxCount;

  const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100].map((m) => m * pow10);

  return candidates.find((c) => raw <= c) || candidates[candidates.length - 1];
}

export default function Axis({
  scale,
  visibleRange,
  width,
  leftMargin,
  rightMargin,
  bottomY,
  label,
  baseFontSize = 13
}) {
  const [min, max] = visibleRange;

  if (max <= min || isNaN(max)) return null;

  const pixelWidth = scale(max) - scale(min);
  const step = getTickStep(min, max, pixelWidth, 70);

  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
    ticks.push(v);
  }

  if (!ticks.includes(max)) {
    ticks.push(max);
  }

  // CONDITIONAL COLLISION DETECTION LOGIC
  let shouldStaggerLastTick = false;
  const visualThresholdPx = 25; // Minimum pixel gap allowed before clashing

  if (ticks.length >= 2) {
    const lastTickX = scale(ticks[ticks.length - 1]);
    const secondLastTickX = scale(ticks[ticks.length - 2]);
    
    // If the visual pixel distance is too small, flag the final label to stagger
    if ((lastTickX - secondLastTickX) < visualThresholdPx) {
      shouldStaggerLastTick = true;
    }
  }

  const calculatedLabelGap = Math.max(14, baseFontSize * 1.15);
  const tickLabelY = bottomY + calculatedLabelGap;
  
  // If we stagger, push the axis title lower down so the text doesn't overlap it
  const axisLabelY = tickLabelY + Math.max(16, baseFontSize * 1.25) + (shouldStaggerLastTick ? 14 : 0);

  return (
    <>
      <line
        x1={leftMargin}
        y1={bottomY}
        x2={width - rightMargin}
        y2={bottomY}
        stroke="#444"
      />

      {ticks.map((val, i) => {
        const x = scale(val);
        const isLastTick = i === ticks.length - 1;
        
        // Determine individual vertical placement offset
        // If flag is true and this is the last item, push it down by 14px
        const currentTickY = (shouldStaggerLastTick && isLastTick) 
          ? tickLabelY + 14 
          : tickLabelY;

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
              y={currentTickY} // Conditional coordinate placement
              fontSize={`${Math.max(13, baseFontSize - 2)}px`} 
              textAnchor="middle"
              fill="#444"
            >
              {Math.round(val)}
            </text>
          </g>
        );
      })}

      {label && (
        <text
          x={(leftMargin + width - rightMargin) / 2}
          y={axisLabelY} 
          fontSize={`${baseFontSize}px`} 
          textAnchor="middle"
          fill="#444"
          style={{ fontWeight: "600", transition: "y 0.1s ease" }}
        >
          {label}
        </text>
      )}
    </>
  );
}