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

const extractCopyNumber = (str) => {
  if (!str || str === "NA" || str === ".") return null;
  const match = str.match(/(\d+)$/);
  return match ? parseFloat(match[1]) : null;
};

const extractMotifName = (str) => {
  if (!str || str === "NA" || str === "." || !str.includes("-")) return null;
  return str.split("-")[0].trim();
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

  const scatterPoints = [];
  const lpmScatterPoints = [];
  let discoveredMotif = row.Motif || "NA";

  // Unified color variables used across both plots
  const allele1Color = "#2478d1"; 
  const allele2Color = "#eb1c3f"; 

  selectedSamples.forEach((sampleIdent, idx) => {
    const fullSampleName = typeof sampleIdent === "number" ? availableSamples[sampleIdent] : sampleIdent;
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

    //Methylation Check: Exit early if data is missing or marked "NA"
    const rawMeth = sample.Mean_meth || sample.meanMeth;
    if (!rawMeth || rawMeth === "NA" || rawMeth === "." || rawMeth === "") return;

    const [rawM1, rawM2] = parseMethylationValues(rawMeth);
    const m1 = rawM1 > 1.0 ? rawM1 / 100 : rawM1;
    const m2 = rawM2 > 1.0 ? rawM2 / 100 : rawM2;

    if (isNaN(m1) || isNaN(m2)) return;

    const track1Len = sample.parsedDecomp?.[0]?.lengths?.reduce((a, b) => a + b, 0) || 0;
    const track2Len = sample.parsedDecomp?.[1]?.lengths?.reduce((a, b) => a + b, 0) || track1Len;
    const len1 = Number(sample.alleleLen1 || track1Len);
    const len2 = Number(sample.alleleLen2 || track2Len);
    
    // If length information is missing or 0, skip plotting.
    
    if (len1 <= 0 || len2 <= 0 || isNaN(len1) || isNaN(len2)) return;

    let a1LpmCount = null;
    let a2LpmCount = null;

    const rawLpmSource = sample.lpm || (sample.LPM ? sample.LPM.split(":") : null);

    if (Array.isArray(rawLpmSource)) {
      const a1Str = String(rawLpmSource[0] || "").trim();
      const a2Str = String(rawLpmSource[1] || "").trim();

      a1LpmCount = extractCopyNumber(a1Str);
      a2LpmCount = extractCopyNumber(a2Str);

      if (discoveredMotif === "NA" || !discoveredMotif) {
        discoveredMotif = extractMotifName(a1Str) || extractMotifName(a2Str) || row.Motif || "NA";
      }
    }

    if (a1LpmCount === null && (sample.LPM || sample.LPM_counts)) {
      const fallbackStr = String(sample.LPM || sample.LPM_counts);
      if (fallbackStr.includes(":")) {
        const parts = fallbackStr.split(":");
        const p1 = parseFloat(parts[0]?.split("-")?.[1]);
        const p2 = parseFloat(parts[1]?.split("-")?.[1]);
        if (!isNaN(p1)) a1LpmCount = p1;
        if (!isNaN(p2)) a2LpmCount = p2;
      }
    }

    scatterPoints.push({
      sampleId: displayName,
      fullName: fullSampleName || displayName,
      alleleLength: len1,
      methylation: m1,
      alleleType: "Allele 1",
      shape: "circle",
      color: allele1Color
    });

    scatterPoints.push({
      sampleId: displayName,
      fullName: fullSampleName || displayName,
      alleleLength: len2,
      methylation: m2,
      alleleType: "Allele 2",
      shape: "diamond",
      color: allele2Color
    });

    if (a1LpmCount !== null) {
      lpmScatterPoints.push({
        sampleId: displayName,
        fullName: fullSampleName || displayName,
        alleleLength: len1,
        lpmCount: a1LpmCount,
        alleleType: "Allele 1",
        shape: "circle",
        color: allele1Color
      });
    }

    if (a2LpmCount !== null) {
      lpmScatterPoints.push({
        sampleId: displayName,
        fullName: fullSampleName || displayName,
        alleleLength: len2,
        lpmCount: a2LpmCount,
        alleleType: "Allele 2",
        shape: "diamond",
        color: allele2Color
      });
    }
  });

  if (scatterPoints.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#666", background: "#fff", borderRadius: 10 }}>
        No valid track data found for the selected cohort.
      </div>
    );
  }

  const allLengths = scatterPoints.map(p => p.alleleLength);
  const maxAxisLen = allLengths.length > 0 ? Math.max(...allLengths, 50) * 1.12 : 500;
  
  const allLpmCounts = lpmScatterPoints.map(p => p.lpmCount);
  const maxLpmAxisVal = allLpmCounts.length > 0 ? Math.max(...allLpmCounts, 5) * 1.15 : 25;

  const chartWidth = 540;
  const chartHeight = 420;
  const padding = { top: 30, right: 35, bottom: 55, left: 65 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const getX = (len) => padding.left + (len / maxAxisLen) * plotWidth;
  const getYMeth = (meth) => padding.top + plotHeight - (meth * plotHeight);
  const getYLpm = (count) => padding.top + plotHeight - ((count / maxLpmAxisVal) * plotHeight);

  const pointRadius = scatterPoints.length > 50 ? 3.5 : 5.0;
  const pointOpacity = scatterPoints.length > 100 ? 0.65 : 0.85;

  return (
    <div style={{ width: "100%", background: "#fff", padding: "20px", borderRadius: "10px", border: "1px solid #eee", boxSizing: "border-box" }}>
      
      {/* TEXT LEGEND SUBHEADER */}
      <div style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: "14px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "15px", color: "#555" }}>
          <strong>Cross-sample-wide statistics</strong>
        </div>
        </div>

        {/* Right Side: Allele legend */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "12px", color: "#555" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: allele1Color, display: "inline-block" }}></span>
            <span>Allele 1</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ display: "inline-block", verticalAlign: "middle" }}>
              <polygon points="5,0 10,5 5,10 0,5" fill={allele2Color} />
            </svg>
            <span>Allele 2</span>
          </div>
        </div>

      </div>

      {/* GRID CONTAINER */}
      <div style={{ display: "flex", flexDirection: "row", gap: "20px", width: "100%", boxSizing: "border-box" }}>
        
        {/* LEFT CHART AREA: METHYLATION */}
        <div style={{ flex: 1, minWidth: "0", border: "1px solid #f0f0f0", padding: "12px", borderRadius: "6px" }}>
          <div style={{ marginBottom: "14px" }}>
            <h4 style={{ margin: 0, fontSize: "13px", fontWeight: "bold", color: "#333" }}>
              Allele Length vs. Mean Methylation
            </h4>
            <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
              Plotting <strong>{scatterPoints.length}</strong> alleles in total
            </div>
          </div>
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ display: "block", overflow: "visible" }}>
            {[0.0, 0.25, 0.50, 0.75, 1.0].map((pct, i) => {
              const yPos = getYMeth(pct);
              return (
                <g key={`y-grid-m-${i}`}>
                  <line x1={padding.left} y1={yPos} x2={chartWidth - padding.right} y2={yPos} stroke="#f5f5f5" strokeWidth={pct === 0 ? 1.5 : 1} />
                  <text x={padding.left - 10} y={yPos + 4} textAnchor="end" style={{ fontSize: "10px", fill: "#666" }}>
                    {(pct * 100).toFixed(0)}%
                  </text>
                </g>
              );
            })}

            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
              const val = Math.round(ratio * maxAxisLen);
              const xPos = getX(val);
              return (
                <g key={`x-grid-m-${i}`}>
                  <line x1={xPos} y1={padding.top} x2={xPos} y2={padding.top + plotHeight} stroke="#f5f5f5" strokeWidth={i === 0 ? 1.5 : 1} />
                  <text x={xPos} y={padding.top + plotHeight + 16} textAnchor="middle" style={{ fontSize: "10px", fill: "#666" }}>
                    {val}
                  </text>
                </g>
              );
            })}

            <line x1={padding.left} y1={padding.top + plotHeight} x2={chartWidth - padding.right} y2={padding.top + plotHeight} stroke="#666" strokeWidth="1.2" />
            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#666" strokeWidth="1.2" />

            <text x={padding.left + plotWidth / 2} y={chartHeight - 15} textAnchor="middle" style={{ fontSize: "11px", fill: "#333", fontWeight: "600" }}>
              Allele Length (bp)
            </text>
            <text x={15} y={padding.top + plotHeight / 2} transform={`rotate(-90, 15, ${padding.top + plotHeight / 2})`} textAnchor="middle" style={{ fontSize: "11px", fill: "#333", fontWeight: "600" }}>
              Methylation Percentage
            </text>

            {scatterPoints.map((pt, i) => {
              const cx = getX(pt.alleleLength);
              const cy = getYMeth(pt.methylation);
              const r = pointRadius;
              return (
                <g key={`m-dots-${i}`}>
                  {pt.shape === "circle" ? (
                    <circle cx={cx} cy={cy} r={r} fill={pt.color} fillOpacity={pointOpacity} stroke="#fff" strokeWidth={0.5} />
                  ) : (
                    <polygon points={`${cx},${cy - r * 1.3} ${cx + r * 1.3},${cy} ${cx},${cy + r * 1.3} ${cx - r * 1.3},${cy}`} fill={pt.color} fillOpacity={pointOpacity} stroke="#fff" strokeWidth={0.5} />
                  )}
                  <title>{`${pt.fullName}\n${pt.alleleType}\nLength: ${pt.alleleLength} bp\nMethylation: ${(pt.methylation * 100).toFixed(1)}%`}</title>
                </g>
              );
            })}
          </svg>
        </div>

        {/* RIGHT CHART AREA: LPM COPY NUMBER */}
        <div style={{ flex: 1, minWidth: "0", border: "1px solid #f0f0f0", padding: "12px", borderRadius: "6px" }}>
          <div style={{ marginBottom: "14px" }}>
            <h4 style={{ margin: 0, fontSize: "13px", fontWeight: "bold", color: "#333" }}>
              Allele Length vs. LPM's (Longest Pure Motif) Copy Number
            </h4>
            <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
              Motif: <strong>{discoveredMotif}</strong> | Plotting <strong>{lpmScatterPoints.length}</strong> alleles in total
            </div>
          </div>
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ display: "block", overflow: "visible" }}>
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
              const countVal = Math.round(ratio * maxLpmAxisVal);
              const yPos = getYLpm(countVal);
              return (
                <g key={`y-grid-l-${i}`}>
                  <line x1={padding.left} y1={yPos} x2={chartWidth - padding.right} y2={yPos} stroke="#f5f5f5" strokeWidth={i === 0 ? 1.5 : 1} />
                  <text x={padding.left - 10} y={yPos + 4} textAnchor="end" style={{ fontSize: "10px", fill: "#666" }}>
                    {countVal}
                  </text>
                </g>
              );
            })}

            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
              const val = Math.round(ratio * maxAxisLen);
              const xPos = getX(val);
              return (
                <g key={`x-grid-l-${i}`}>
                  <line x1={xPos} y1={padding.top} x2={xPos} y2={padding.top + plotHeight} stroke="#f5f5f5" strokeWidth={i === 0 ? 1.5 : 1} />
                  <text x={xPos} y={padding.top + plotHeight + 16} textAnchor="middle" style={{ fontSize: "10px", fill: "#666" }}>
                    {val}
                  </text>
                </g>
              );
            })}

            <line x1={padding.left} y1={padding.top + plotHeight} x2={chartWidth - padding.right} y2={padding.top + plotHeight} stroke="#666" strokeWidth="1.2" />
            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#666" strokeWidth="1.2" />

            <text x={padding.left + plotWidth / 2} y={chartHeight - 15} textAnchor="middle" style={{ fontSize: "11px", fill: "#333", fontWeight: "600" }}>
              Allele Length (bp)
            </text>
            <text x={15} y={padding.top + plotHeight / 2} transform={`rotate(-90, 15, ${padding.top + plotHeight / 2})`} textAnchor="middle" style={{ fontSize: "11px", fill: "#333", fontWeight: "600" }}>
              LPM Copy-Number ({discoveredMotif})
            </text>

            {lpmScatterPoints.map((pt, i) => {
              const cx = getX(pt.alleleLength);
              const cy = getYLpm(pt.lpmCount);
              const r = pointRadius;
              return (
                <g key={`lpm-dots-${i}`}>
                  {pt.shape === "circle" ? (
                    <circle cx={cx} cy={cy} r={r} fill={pt.color} fillOpacity={pointOpacity} stroke="#fff" strokeWidth={0.5} />
                  ) : (
                    <polygon points={`${cx},${cy - r * 1.3} ${cx + r * 1.3},${cy} ${cx},${cy + r * 1.3} ${cx - r * 1.3},${cy}`} fill={pt.color} fillOpacity={pointOpacity} stroke="#fff" strokeWidth={0.5} />
                  )}
                  <title>{`${pt.fullName}\n${pt.alleleType}\nLength: ${pt.alleleLength} bp\nLPM Value: ${discoveredMotif}-${pt.lpmCount}`}</title>
                </g>
              );
            })}
          </svg>
        </div>

      </div>
    </div>
  );
}