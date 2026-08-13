import React from "react";

// Helper to add controlled visual jitter to overlapping coordinates
const applyJitter = (val, spread = 0.5) => (val !== null && val !== undefined ? val + (Math.random() - 0.5) * spread : val);

const parseMethylationValues = (val) => {
  if (val === undefined || val === null || val === "" || val === "NA" || val === "." || val === ".,.") {
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

const extractMotifName = (str) => {
  if (!str || typeof str !== "string") return null;
  const cleaned = str.replace(/[^a-zA-Z0-9-:_]/g, "");
  if (cleaned.includes("-")) return cleaned.split("-")[0].trim();
  if (cleaned.includes(":")) return cleaned.split(":")[0].trim();
  const match = cleaned.match(/[A-Za-z]+/);
  return match ? match[0] : null;
};

const extractPositiveNumber = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) || val <= 0 ? null : val;
  
  const str = String(val).trim();
  if (str === "" || str === "NA" || str === "." || str === ".," || str === ".,." || str === "None") return null;

  const matches = str.match(/\d+(?:\.\d+)?/g);
  if (!matches) return null;
  
  const num = parseFloat(matches[matches.length - 1]);
  return isNaN(num) || num <= 0 ? null : num;
};

const parseLpmValue = (val) => {
  if (val === null || val === undefined || val === "" || val === "NA" || val === "." || val === ".,.") {
    return [null, null];
  }

  let parsed = val;
  if (typeof val === "string" && (val.includes("[") || val.includes("{"))) {
    try {
      parsed = JSON.parse(val.replace(/'/g, '"'));
    } catch {
      parsed = val;
    }
  }

  if (Array.isArray(parsed)) {
    let a1 = extractPositiveNumber(parsed[0]);
    let a2 = extractPositiveNumber(parsed[1]);

    if (a1 === null && a2 !== null) a1 = a2;
    if (a2 === null && a1 !== null) a2 = a1;

    return [a1, a2];
  }

  if (typeof parsed === "string") {
    const alleleSegments = parsed.split(/[,|/]+/);
    
    let a1 = extractPositiveNumber(alleleSegments[0]);
    let a2 = alleleSegments[1] ? extractPositiveNumber(alleleSegments[1]) : null;

    if (a1 === null && a2 !== null) a1 = a2;
    if (a2 === null && a1 !== null) a2 = a1;

    return [a1, a2];
  }

  const single = extractPositiveNumber(parsed);
  return [single, single];
};

const extractLpmFromDecompTrack = (track) => {
  if (!track) return null;
  const candidateValues = [];
  
  const check = (v) => {
    const num = extractPositiveNumber(v);
    if (num !== null) candidateValues.push(num);
  };

  check(track.lpm);
  check(track.copies);
  check(track.count);
  check(track.length);
  check(track.repeats);

  if (Array.isArray(track.copies)) track.copies.forEach(check);
  if (Array.isArray(track.motifs)) {
    track.motifs.forEach(m => {
      if (typeof m === "object" && m !== null) {
        check(m.copies ?? m.count ?? m.lpm ?? m.length);
      } else {
        check(m);
      }
    });
  }

  return candidateValues.length > 0 ? Math.max(...candidateValues) : null;
};

export default function OverviewDashboard({ data, selectedSamples = [], availableSamples = [], baseFontSize = 13}) {
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

    // 1. Calculate allele lengths
    const track1Len = sample.parsedDecomp?.[0]?.lengths?.reduce((a, b) => a + (Number(b) || 0), 0) || 0;
    const track2Len = sample.parsedDecomp?.[1]?.lengths?.reduce((a, b) => a + (Number(b) || 0), 0) || 0;
    
    const len1 = Number(sample.alleleLen1 || track1Len || 0);
    const len2 = Number(sample.alleleLen2 || track2Len || (sample.parsedDecomp?.length > 1 ? len1 : 0));

    const hasValidLen1 = !isNaN(len1) && len1 > 0;
    const hasValidLen2 = !isNaN(len2) && len2 > 0;

    if (!hasValidLen1 && !hasValidLen2) return;

    // 2. Process Methylation Data
    const rawMeth = sample.Mean_meth || sample.meanMeth;
    const hasMethData = rawMeth && rawMeth !== "NA" && rawMeth !== "." && rawMeth !== ".,." && rawMeth !== "";

    if (hasMethData) {
      const [rawM1, rawM2] = parseMethylationValues(rawMeth);
      const m1 = rawM1 > 1.0 ? rawM1 / 100 : rawM1;
      const m2 = rawM2 > 1.0 ? rawM2 / 100 : rawM2;

      if (hasValidLen1 && !isNaN(m1)) {
        scatterPoints.push({
          sampleId: displayName,
          fullName: fullSampleName || displayName,
          alleleLength: applyJitter(len1, 0.6),
          rawAlleleLength: len1,
          methylation: applyJitter(m1, 0.012),
          rawMethylation: m1,
          alleleType: "Allele 1",
          shape: "circle",
          color: allele1Color
        });
      }

      if (hasValidLen2 && !isNaN(m2)) {
        scatterPoints.push({
          sampleId: displayName,
          fullName: fullSampleName || displayName,
          alleleLength: applyJitter(len2, 0.6),
          rawAlleleLength: len2,
          methylation: applyJitter(m2, 0.012),
          rawMethylation: m2,
          alleleType: "Allele 2",
          shape: "diamond",
          color: allele2Color
        });
      }
    }

    // 3. Process LPM Copy Numbers
    let a1LpmCount = null;
    let a2LpmCount = null;

    const directA1 = extractPositiveNumber(
      sample.lpm1 ?? sample.LPM1 ?? sample.allele1_lpm ?? sample.allele1_LPM ?? sample.a1_lpm
    );
    const directA2 = extractPositiveNumber(
      sample.lpm2 ?? sample.LPM2 ?? sample.allele2_lpm ?? sample.allele2_LPM ?? sample.a2_lpm
    );

    if (directA1 !== null || directA2 !== null) {
      a1LpmCount = directA1;
      a2LpmCount = directA2 ?? directA1;
    } else {
      const rawLpm = 
        sample.lpm ?? 
        sample.LPM ?? 
        sample.LPM_counts ?? 
        sample.lpm_counts ?? 
        sample.LPM_count ?? 
        sample.lpm_count ?? 
        sample.LPM_copies ?? 
        sample.lpm_copies ?? 
        sample.motif_lpm ?? 
        sample.LPM_str;

      if (rawLpm !== undefined && rawLpm !== null) {
        const [parsedA1, parsedA2] = parseLpmValue(rawLpm);
        a1LpmCount = parsedA1;
        a2LpmCount = parsedA2;

        if (discoveredMotif === "NA" || !discoveredMotif) {
          discoveredMotif = extractMotifName(String(rawLpm)) || row.Motif || "NA";
        }
      }
    }

    if ((a1LpmCount === null && a2LpmCount === null) && sample.parsedDecomp && Array.isArray(sample.parsedDecomp)) {
      a1LpmCount = extractLpmFromDecompTrack(sample.parsedDecomp[0]);
      a2LpmCount = extractLpmFromDecompTrack(sample.parsedDecomp[1]) ?? a1LpmCount;
    }

    if (hasValidLen1 && a1LpmCount !== null) {
      lpmScatterPoints.push({
        sampleId: displayName,
        fullName: fullSampleName || displayName,
        alleleLength: applyJitter(len1, 0.6),    // Jittered X coordinate
        rawAlleleLength: len1,                   // Pure X for Tooltip
        lpmCount: applyJitter(a1LpmCount, 0.22), // Jittered Y coordinate
        rawLpmCount: a1LpmCount,                 // Pure Y for Tooltip
        alleleType: "Allele 1",
        shape: "circle",
        color: allele1Color
      });
    }

    if (hasValidLen2 && a2LpmCount !== null) {
      lpmScatterPoints.push({
        sampleId: displayName,
        fullName: fullSampleName || displayName,
        alleleLength: applyJitter(len2, 0.6),    // Jittered X coordinate
        rawAlleleLength: len2,                   // Pure X for Tooltip
        lpmCount: applyJitter(a2LpmCount, 0.22), // Jittered Y coordinate
        rawLpmCount: a2LpmCount,                 // Pure Y for Tooltip
        alleleType: "Allele 2",
        shape: "diamond",
        color: allele2Color
      });
    }
  });

  if (scatterPoints.length === 0 && lpmScatterPoints.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#666", background: "#fff", borderRadius: 10 }}>
        No valid data found for the selected cohort.
      </div>
    );
  }

  // Calculate scales using clean raw lengths & values
  const allLengths = [...scatterPoints, ...lpmScatterPoints].map(p => p.rawAlleleLength);
  const maxAxisLen = allLengths.length > 0 ? Math.max(...allLengths, 50) * 1.12 : 500;
  
  const allLpmCounts = lpmScatterPoints.map(p => p.rawLpmCount);
  const maxLpmAxisVal = allLpmCounts.length > 0 ? Math.max(...allLpmCounts, 5) * 1.15 : 25;

  const chartWidth = 540;
  const chartHeight = 420;
  const padding = { top: 30, right: 35, bottom: 55, left: 65 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const getX = (len) => padding.left + (len / maxAxisLen) * plotWidth;
  const getYMeth = (meth) => padding.top + plotHeight - (meth * plotHeight);
  const getYLpm = (count) => padding.top + plotHeight - ((count / maxLpmAxisVal) * plotHeight);

  // Set radius and opacity tuned for dense overlapping clusters
  const pointRadius = lpmScatterPoints.length > 100 ? 3.5 : 4.5;
  const pointOpacity = 1.0;

  return (
    <div style={{ width: "100%", background: "#fff", padding: "20px", borderRadius: "10px", border: "1px solid #eee", boxSizing: "border-box" }}>
      
      {/* TEXT LEGEND SUBHEADER */}
      <div style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: "14px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: `${baseFontSize + 2}px`, color: "#555" }}>
            <strong>Cross-sample-wide statistics</strong>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: `${baseFontSize - 1}px`, color: "#555" }}>
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
            <h4 style={{ margin: 0, fontSize: `${baseFontSize}px`, fontWeight: "bold", color: "#333" }}>
              Allele Length vs. Mean Methylation
            </h4>
            <div style={{ fontSize: `${baseFontSize - 2}px`, color: "#666", marginTop: "2px" }}>
              Plotting <strong>{scatterPoints.length}</strong> alleles in total
            </div>
          </div>
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ display: "block", overflow: "visible" }}>
            {[0.0, 0.25, 0.50, 0.75, 1.0].map((pct, i) => {
              const yPos = getYMeth(pct);
              return (
                <g key={`y-grid-m-${i}`}>
                  <line x1={padding.left} y1={yPos} x2={chartWidth - padding.right} y2={yPos} stroke="#f5f5f5" strokeWidth={pct === 0 ? 1.5 : 1} />
                  <text x={padding.left - 10} y={yPos + 4} textAnchor="end" style={{ fontSize: `${baseFontSize - 3}px`, fill: "#666" }}>
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
                  <text x={xPos} y={padding.top + plotHeight + 16} textAnchor="middle" style={{ fontSize: `${baseFontSize - 3}px`, fill: "#666" }}>
                    {val}
                  </text>
                </g>
              );
            })}

            <line x1={padding.left} y1={padding.top + plotHeight} x2={chartWidth - padding.right} y2={padding.top + plotHeight} stroke="#666" strokeWidth="1.2" />
            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#666" strokeWidth="1.2" />

            <text x={padding.left + plotWidth / 2} y={chartHeight - 15} textAnchor="middle" style={{ fontSize: `${baseFontSize - 2}px`, fill: "#333", fontWeight: "600" }}>
              Allele Length (bp)
            </text>
            <text x={15} y={padding.top + plotHeight / 2} transform={`rotate(-90, 15, ${padding.top + plotHeight / 2})`} textAnchor="middle" style={{ fontSize: `${baseFontSize - 2}px`, fill: "#333", fontWeight: "600" }}>
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
                  <title>{`${pt.fullName}\n${pt.alleleType}\nLength: ${pt.rawAlleleLength} bp\nMethylation: ${(pt.rawMethylation * 100).toFixed(1)}%`}</title>
                </g>
              );
            })}
          </svg>
        </div>

        {/* RIGHT CHART AREA: LPM COPY NUMBER */}
        <div style={{ flex: 1, minWidth: "0", border: "1px solid #f0f0f0", padding: "12px", borderRadius: "6px" }}>
          <div style={{ marginBottom: "14px" }}>
            <h4 style={{ margin: 0, fontSize: `${baseFontSize}px`, fontWeight: "bold", color: "#333" }}>
              Allele Length vs. LPM's (Longest Pure Motif) Copy Number
            </h4>
            <div style={{ fontSize: `${baseFontSize - 2}px`, color: "#666", marginTop: "2px" }}>
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
                  <text x={padding.left - 10} y={yPos + 4} textAnchor="end" style={{ fontSize: `${baseFontSize - 3}px`, fill: "#666" }}>
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
                  <text x={xPos} y={padding.top + plotHeight + 16} textAnchor="middle" style={{ fontSize: `${baseFontSize - 3}px`, fill: "#666" }}>
                    {val}
                  </text>
                </g>
              );
            })}

            <line x1={padding.left} y1={padding.top + plotHeight} x2={chartWidth - padding.right} y2={padding.top + plotHeight} stroke="#666" strokeWidth="1.2" />
            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#666" strokeWidth="1.2" />

            <text x={padding.left + plotWidth / 2} y={chartHeight - 15} textAnchor="middle" style={{ fontSize: `${baseFontSize - 2}px`, fill: "#333", fontWeight: "600" }}>
              Allele Length (bp)
            </text>
            <text x={15} y={padding.top + plotHeight / 2} transform={`rotate(-90, 15, ${padding.top + plotHeight / 2})`} textAnchor="middle" style={{ fontSize: `${baseFontSize - 2}px`, fill: "#333", fontWeight: "600" }}>
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
                  <title>{`${pt.fullName}\n${pt.alleleType}\nA. length: ${pt.rawAlleleLength} bp\nLPM copynumber: ${pt.rawLpmCount}`}</title>
                </g>
              );
            })}
          </svg>
        </div>

      </div>
    </div>
  );
}