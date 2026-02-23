/* Pick a nice step that is a multiple of 10 or 100 */
function niceStep(max) {
  const targetDivs = 7;
  const raw = max / targetDivs;
  const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [10, 20, 25, 50, 100].map((m) => (m * pow10) / 10);
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

  if (max <= min) return null;

  const step = niceStep(max - min);
  const ticks = [];

  const lastFullTick = Math.floor((max - min) / step) * step;

  for (let v = 0; v <= lastFullTick; v += step) {
    ticks.push(min + v);
  }

  if (ticks[ticks.length - 1] !== max) {
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