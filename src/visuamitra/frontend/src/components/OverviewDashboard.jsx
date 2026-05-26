// OverviewDashboard.jsx
import React from "react";

const parseMethylationValues = (val) => {
  if (val === undefined || val === null || val === "" || val === "NA" || val === ".") {
    return [0, 0];
  }
  let parsed = val;
  if (typeof val === "string" && val.includes("[")) {
    try { 
      parsed = JSON.parse(val.replace(/'/g, '"')); 
    } catch { 
      parsed = val; 
    }
  }
  if (Array.isArray(parsed)) {
    let m1 = Number(parsed[0] || 0);
    let m2 = Number(parsed[1] || m1 || 0);
    return [m1, m2];
  }
  if (typeof parsed === "string" && parsed.includes("|")) {
    const parts = parsed.split("|");
    return [Number(parts[0]?.trim() || 0), Number(parts[1]?.trim() || 0)];
  }
  const num = Number(parsed || 0);
  return [num, num];
};

export default function OverviewDashboard({ data, selectedSamples = [], availableSamples = [] }) {
  const row = data; 
  
  if (!row || !row.samples || selectedSamples.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#666", background: "#fff", borderRadius: 10 }}>
        No sample data compiled to generate summary plots.
      </div>
    );
  }

  // DATA EXTRACTION 
  const scatterPoints = [];

  selectedSamples.forEach((sampleIdent, idx) => {
    const fullSampleName = typeof sampleIdent === "number" ? availableSamples[sampleIdent] : sampleIdent;
    
    // Fallback key resolving layer supporting prefixes safely
    const samplePrefix = fullSampleName ? fullSampleName.split('-')[0].trim() : "";
    const displayName = samplePrefix || `Sample ${idx}`;
    
    const sample = 
      row.samples[fullSampleName] ||                 
      row.samples[samplePrefix] ||
      row.samples[sampleIdent] ||                        
      row.samples[String(sampleIdent)] ||                
      Object.values(row.samples).find(s => 
        s && (
          String(s.SampleID) === String(fullSampleName) || 
          String(s.SampleID || "").split('-')[0].trim() === samplePrefix ||
          (fullSampleName && s.SampleID && fullSampleName.startsWith(s.SampleID.split('-')[0]))
        )
      );

    if (!sample) return;

    // Extract allele lengths
    const len1 = Number(sample.alleleLen1 || sample.parsedDecomp?.[1]?.totalLen || 0);
    const len2 = Number(sample.alleleLen2 || sample.parsedDecomp?.[2]?.totalLen || 0);
    
    // Extract methylation values
    const [rawM1, rawM2] = parseMethylationValues(sample.Mean_meth || sample.meanMeth);
    const m1 = rawM1 > 1.0 ? rawM1 / 100 : rawM1;
    const m2 = rawM2 > 1.0 ? rawM2 / 100 : rawM2;

    // Push separate points for Allele 1 and Allele 2 into same space
    scatterPoints.push({
      sampleId: displayName,
      fullName: fullSampleName || displayName,
      alleleLength: len1,
      methylation: m1,
      alleleType: "Allele 1",
      shape: "circle",
      color: "#2b5c8f" // Blue
    });

    scatterPoints.push({
      sampleId: displayName,
      fullName: fullSampleName || displayName,
      alleleLength: len2,
      methylation: m2,
      alleleType: "Allele 2",
      shape: "square",
      color: "#a6305d" // Magenta/Pink
    });
  });

  if (scatterPoints.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#666", background: "#fff", borderRadius: 10 }}>
        No valid track data found for the selected cohort.
      </div>
    );
  }

  // PLOT AXES CONFIGURATIONS
  const allLengths = scatterPoints.map(p => p.alleleLength);
  const maxAxisLen = allLengths.length > 0 ? Math.max(...allLengths, 50) * 1.15 : 500;
  const chartWidth = 960;
  const chartHeight = 520;
  const padding = { top: 50, right: 160, bottom: 65, left: 75 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Linear Scale Transformation Functions
  const getX = (len) => padding.left + (len / maxAxisLen) * plotWidth;
  const getY = (meth) => padding.top + plotHeight - (meth * plotHeight);

  // Dynamic sizing tuning based on dataset crowd size
  const pointRadius = scatterPoints.length > 50 ? 4 : 5.5;
  const pointOpacity = scatterPoints.length > 100 ? 0.60 : 0.80;
  //console.log("Dashboard Received Selected Count:", selectedSamples.length);
  //console.log("Actual Generated Scatter points:", scatterPoints.length);

  return (
    <div style={{ width: "100%", background: "#fff", padding: "24px", borderRadius: "10px", boxSizing: "border-box", border: "1px solid #eee" }}>
      
      {/* TITLE & PROFILE HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "15px", borderBottom: "1px solid #f0f0f0", paddingBottom: "10px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "bold", color: "#222" }}>
            Allele Length & Mean Methylation Comparison
          </h3>
          <span style={{ fontSize: "12px", color: "#666" }}>
            Plotting <strong>{scatterPoints.length} alleles</strong> from the selected genomic window.
          </span>
        </div>
      </div>

      {/* SINGLE PLOT CORE SVG */}
      <svg width={chartWidth} height={chartHeight} style={{ display: "block", margin: "0 auto", overflow: "visible" }}>
        
        {/* BACKGROUND GRID LINES - Y AXIS (Methylation Level Ticks) */}
        {[0.0, 0.25, 0.50, 0.75, 1.0].map((pct, i) => {
          const yPos = getY(pct);
          return (
            <g key={`y-grid-${i}`}>
              <line x1={padding.left} y1={yPos} x2={chartWidth - padding.right} y2={yPos} stroke="#f3f3f3" strokeWidth={pct === 0 ? 1.5 : 1} />
              <text x={padding.left - 12} y={yPos + 4} textAnchor="end" style={{ fontSize: "11px", fill: "#555", fontWeight: "500" }}>
                {(pct * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* BACKGROUND GRID LINES - X AXIS (Allele Length Ticks) */}
        {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
          const val = Math.round(ratio * maxAxisLen);
          const xPos = getX(val);
          return (
            <g key={`x-grid-${i}`}>
              <line x1={xPos} y1={padding.top} x2={xPos} y2={padding.top + plotHeight} stroke="#f3f3f3" strokeWidth={i === 0 ? 1.5 : 1} />
              <text x={xPos} y={padding.top + plotHeight + 20} textAnchor="middle" style={{ fontSize: "11px", fill: "#555", fontWeight: "500" }}>
                {val} bp
              </text>
            </g>
          );
        })}

        {/* HARD AXIS BORDERS */}
        <line x1={padding.left} y1={padding.top + plotHeight} x2={chartWidth - padding.right} y2={padding.top + plotHeight} stroke="#777" strokeWidth="1.5" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#777" strokeWidth="1.5" />

        {/* AXIS LABELS */}
        <text x={padding.left + plotWidth / 2} y={chartHeight - 15} textAnchor="middle" style={{ fontSize: "13px", fill: "#333", fontWeight: "bold" }}>
          Allele Length (bp)
        </text>
        <text x={20} y={padding.top + plotHeight / 2} transform={`rotate(-90, 20, ${padding.top + plotHeight / 2})`} textAnchor="middle" style={{ fontSize: "13px", fill: "#333", fontWeight: "bold" }}>
          Mean Methylation Percentage
        </text>

        {/* SCATTER POINTS LAYER */}
        {scatterPoints.map((pt, i) => {
          const cx = getX(pt.alleleLength);
          const cy = getY(pt.methylation);
          const r = pointRadius;

          return (
            <g key={`point-${i}`} style={{ cursor: "pointer" }}>
              {pt.shape === "circle" ? (
                /* Allele 1: Circle */
                <circle 
                  cx={cx} 
                  cy={cy} 
                  r={r} 
                  fill={pt.color} 
                  fillOpacity={pointOpacity}
                  stroke="#fff" 
                  strokeWidth={0.5} 
                />
              ) : (
                /* Allele 2: Diamond */
                <polygon 
                  points={`${cx},${cy - r * 1.3} ${cx + r * 1.3},${cy} ${cx},${cy + r * 1.3} ${cx - r * 1.3},${cy}`}
                  fill={pt.color} 
                  fillOpacity={pointOpacity}
                  stroke="#fff" 
                  strokeWidth={0.5} 
                />
              )}
              <title>{`${pt.fullName}\n${pt.alleleType}\nLength: ${pt.alleleLength} bp\nMean-Methylation: ${(pt.methylation * 100).toFixed(1)}%`}</title>
            </g>
          );
        })}

        <g transform={`translate(${chartWidth - padding.right + 25}, ${padding.top + 20})`}>
          <rect x="-10" y="5" width="135" height="65" fill="#fcfcfc" stroke="#e8e8e8" rx="4" />    
          <circle cx="10" cy="25" r="5.5" fill="#2b5c8f" />
          <text x="24" y="29" style={{ fontSize: "11px", fill: "#555" }}>Allele 1 (Circle)</text>
          <polygon points="10,41.5 16,47.5 10,53.5 4,47.5" fill="#a6305d" />
          <text x="24" y="52" style={{ fontSize: "11px", fill: "#555" }}>Allele 2 (Diamond)</text>
        </g>
      </svg>
    </div>
  );
}