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

export default function OverviewDashboard({ data, selectedSamples, availableSamples }) {
  const row = data; 
  if (!row || !row.samples || selectedSamples.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#666", background: "#fff", borderRadius: 10 }}>
        No sample data compiled to generate summary plots.
      </div>
    );
  }

  // DATA EXTRACTION LAYER 
  const parsedData = selectedSamples.map((idx) => {
    const fullSampleName = availableSamples[idx];
    const displayName = fullSampleName ? fullSampleName.split('-')[0] : `Index ${idx}`;
    
    const sample = 
      row.samples[fullSampleName] ||                 
      row.samples[idx] ||                        
      row.samples[String(idx)] ||                
      Object.values(row.samples).find(s => 
        s && (
          String(s.SampleID) === String(fullSampleName) || 
          String(s.SampleIdx) === String(idx) ||
          (fullSampleName && s.SampleID && fullSampleName.startsWith(s.SampleID.split('-')[0]))
        )
      );

    if (!sample) return null;

    const len1 = Number(sample.alleleLen1 || sample.parsedDecomp?.[1]?.totalLen || 0);
    const len2 = Number(sample.alleleLen2 || sample.parsedDecomp?.[2]?.totalLen || 0);
    
    const [rawM1, rawM2] = parseMethylationValues(sample.Mean_meth || sample.meanMeth);
    const m1 = rawM1 > 1.0 ? rawM1 / 100 : rawM1;
    const m2 = rawM2 > 1.0 ? rawM2 / 100 : rawM2;

    return { name: displayName, fullName: fullSampleName || displayName, allele1: len1, allele2: len2, meth1: m1, meth2: m2 };
  }).filter(Boolean);

  const allLengths = parsedData.flatMap(d => [d.allele1, d.allele2]);
  const maxAxisLen = allLengths.length > 0 ? Math.max(...allLengths, 10) * 1.2 : 50;

  // Viewport Chart Dimension Schemes
  const chartWidth = 475;
  const chartHeight = 290;
  const padding = { top: 45, right: 30, bottom: 60, left: 60 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  return (
    <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", width: "100%", background: "#fff", padding: "20px", borderRadius: "10px" }}>
      
      {/* PLOT 1: INDIVIDUAL ALLELE LENGTHS PER SAMPLE */}
      <div style={plotCardStyle}>
        <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
          <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "bold", color: "#333" }}>Allele Lengths Profile </h3>
          
          {/* INLINE LEGEND */}
          <svg width="140" height="15" style={{ marginLeft: "auto" }}>
            <rect x="5" y="2" width="12" height="10" fill="#2d5a27" opacity="0.85" rx={1} />
            <text x="22" y="11" style={{ fontSize: "10px", fill: "#555" }}>Allele 1</text>
            <rect x="75" y="2" width="12" height="10" fill="#6da067" opacity="0.85" rx={1} />
            <text x="92" y="11" style={{ fontSize: "10px", fill: "#555" }}>Allele 2</text>
          </svg>
        </div>

        <svg width={chartWidth} height={chartHeight}>
          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
            const y = padding.top + plotHeight - (ratio * plotHeight);
            const val = Math.round(ratio * maxAxisLen);
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#f0f0f0" />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" style={{ fontSize: "10px", fill: "#666" }}>{val} bp</text>
              </g>
            );
          })}
          <line x1={padding.left} y1={padding.top + plotHeight} x2={chartWidth - padding.right} y2={padding.top + plotHeight} stroke="#aaa" strokeWidth="1.5" />
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#aaa" strokeWidth="1.5" />
          
          {parsedData.map((pt, idx) => {
            const channelWidth = plotWidth / parsedData.length;
            const centerX = padding.left + (idx * channelWidth) + channelWidth / 2;
            const barWidth = Math.min(18, channelWidth / 3);
            
            const yA1 = padding.top + plotHeight - ((pt.allele1 / maxAxisLen) * plotHeight);
            const yA2 = padding.top + plotHeight - ((pt.allele2 / maxAxisLen) * plotHeight);

            return (
              <g key={idx}>
                {/* Allele 1 Tracking Bar + Hover Tooltip */}
                <g style={{ cursor: "pointer" }}>
                  <rect x={centerX - barWidth - 2} y={yA1} width={barWidth} height={Math.max(0, padding.top + plotHeight - yA1)} fill="#2d5a27" opacity="0.85" rx={1} />
                  <text x={centerX - barWidth / 2 - 2} y={yA1 - 4} textAnchor="middle" style={{ fontSize: "9px", fontWeight: "bold", fill: "#2d5a27" }}>{pt.allele1}</text>
                  <title>{`${pt.fullName}\nAllele 1 Size: ${pt.allele1} bp`}</title>
                </g>

                {/* Allele 2 Tracking Bar + Hover Tooltip */}
                <g style={{ cursor: "pointer" }}>
                  <rect x={centerX + 2} y={yA2} width={barWidth} height={Math.max(0, padding.top + plotHeight - yA2)} fill="#6da067" opacity="0.85" rx={1} />
                  <text x={centerX + barWidth / 2 + 2} y={yA2 - 4} textAnchor="middle" style={{ fontSize: "9px", fontWeight: "bold", fill: "#44703e" }}>{pt.allele2}</text>
                  <title>{`${pt.fullName}\nAllele 2 Size: ${pt.allele2} bp`}</title>
                </g>

                <text x={centerX} y={padding.top + plotHeight + 18} textAnchor="middle" style={{ fontSize: "11px", fontWeight: "600", fill: "#2d5a27" }}>
                  {pt.name}
                </text>
              </g>
            );
          })}
          <text x={padding.left - 45} y={padding.top + plotHeight / 2} transform={`rotate(-90, ${padding.left - 45}, ${padding.top + plotHeight / 2})`} textAnchor="middle" style={{ fontSize: "11px", fill: "#444", fontWeight: "bold" }}>Allele Length</text>
        </svg>
      </div>

      {/* PLOT 2: METHYLATION EXPANSION GRID                      */}
      <div style={plotCardStyle}>
        <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
          <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "bold", color: "#333" }}>Mean Methylation variation </h3>
          
          {/* INLINE LEGEND */}
          <svg width="140" height="15" style={{ marginLeft: "auto" }}>
            <circle cx="10" cy="7" r="5" fill="#1a56b0" stroke="#fff" strokeWidth="1" />
            <text x="20" y="11" style={{ fontSize: "10px", fill: "#555" }}>Allele 1</text>
            <circle cx="80" cy="7" r="5" fill="#4da3ff" stroke="#fff" strokeWidth="1" />
            <text x="90" y="11" style={{ fontSize: "10px", fill: "#555" }}>Allele 2</text>
          </svg>
        </div>

        <svg width={chartWidth} height={chartHeight}>
          <line x1={padding.left} y1={padding.top + plotHeight} x2={chartWidth - padding.right} y2={padding.top + plotHeight} stroke="#aaa" strokeWidth="1.5" />
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#aaa" strokeWidth="1.5" />
          
          {[0.0, 0.25, 0.50, 0.75, 1.0].map((pct, i) => {
            const y = padding.top + plotHeight - (pct * plotHeight);
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#eee" strokeDasharray="3,3" />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" style={{ fontSize: "10px", fill: "#666" }}>{(pct * 100).toFixed(0)}%</text>
              </g>
            );
          })}

          {parsedData.map((pt, idx) => {
            const channelWidth = plotWidth / parsedData.length;
            const centerX = padding.left + (idx * channelWidth) + (channelWidth / 2);
            
            const yMeth1 = padding.top + plotHeight - (pt.meth1 * plotHeight);
            const yMeth2 = padding.top + plotHeight - (pt.meth2 * plotHeight);

            return (
              <g key={idx}>
                <line x1={centerX} y1={padding.top} x2={centerX} y2={padding.top + plotHeight} stroke="#f5f5f5" />

                {/* Phased Haplotype 1 Marker (Dark Blue) */}
                <circle cx={centerX - 8} cy={yMeth1} r={7.5} fill="#1a56b0" stroke="#fff" strokeWidth="1.5" style={{ cursor: "pointer" }}>
                  <title>{`A1 Mean-methylation: ${(pt.meth1 * 100).toFixed(1)}%`}</title>
                </circle>

                {/* Phased Haplotype 2 Marker (Light Sky Blue) */}
                <circle cx={centerX + 8} cy={yMeth2} r={7.5} fill="#4da3ff" stroke="#fff" strokeWidth="1.5" style={{ cursor: "pointer" }}>
                  <title>{`A2 Mean-methylation: ${(pt.meth2 * 100).toFixed(1)}%`}</title>
                </circle>

                <text x={centerX} y={padding.top + plotHeight + 18} textAnchor="middle" style={{ fontSize: "11px", fontWeight: "600", fill: "#2d5a27" }}>
                  {pt.name}
                </text>
              </g>
            );
          })}
          <text x={padding.left - 45} y={padding.top + plotHeight / 2} transform={`rotate(-90, ${padding.left - 45}, ${padding.top + plotHeight / 2})`} textAnchor="middle" style={{ fontSize: "11px", fill: "#444", fontWeight: "bold" }}>Methylation Fraction</text>
        </svg>
      </div>

    </div>
  );
}

const plotCardStyle = { flex: "1 1 440px", padding: "15px", background: "#fafafa", borderRadius: "8px", border: "1px solid #eaeaea" };