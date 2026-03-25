/* Pick a nice step that is a multiple of 10 or 100 */
function niceStep(max) {
  const targetDivs = 7;
  const raw = max / targetDivs;
  const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [10, 20, 25, 50, 100].map((m) => (m * pow10) / 10);
  return candidates.find((c) => raw <= c) || candidates[candidates.length - 1];
}


function getTickStep(min, max, pixelWidth, targetPx = 70) {
  const span = max - min;
  // how many ticks to aim for:
  const approxCount = Math.max(1, Math.floor(pixelWidth / targetPx));
  const raw = span / approxCount;

  // choose a human-friendly multiple of 1,2,5,10…
  const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [1,2,5,10,20,25,50,100].map((m) => m * pow10);

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