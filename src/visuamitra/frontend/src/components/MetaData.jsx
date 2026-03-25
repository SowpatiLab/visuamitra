import React from "react";
import Tooltip from "./motifTooltip"; 

// Helper to format values like [288, 272] or 0.856
const formatValue = (val) => {
  if (val === undefined || val === null || val === "" || val === "NA") return "—";
  let parsed = val;
  if (typeof val === "string" && val.includes("[")) {
    try { parsed = JSON.parse(val.replace(/'/g, '"')); } catch { parsed = val; }
  }
  if (Array.isArray(parsed)) {
    return parsed.map(v => (typeof v === 'number' ? v.toFixed(2) : v)).join(" | ");
  }
  return typeof parsed === 'number' ? parsed.toFixed(2) : parsed;
};

export default function MetadataDisplay({ row, selectedIndices = [], availableSamples = [] }) {
  // 1. Safeguard: if data hasn't loaded yet
  if (!row || !row.samples) return null;

  // 2. Global Data (Top Pills)
  // We grab Motif/Size from the row or the first available sample as a fallback
  const firstAvailable = row.samples[Object.keys(row.samples)[0]] || {};
  const locusID = row.ID || row.id || "N/A";
  const motif = row.Motif || firstAvailable.Motif || "N/A";
  const motifSize = row.Motif_size || firstAvailable.Motif_size || "—";

  const isLong = motif.length > 20;
  const motifDisplay = isLong ? `${motif.slice(0, 20)}…` : motif;
  const showMotifTooltip = isLong ? `${motif} (length: ${motif.length})` : "";

  return (
    <div style={containerStyle}>
      {/* Global Context Header */}
      <div style={headerStyle}>
        <div style={pillStyle}><strong>Locus ID:</strong> {locusID}</div>
        <div style={pillStyle}>
          <strong>Motif:</strong>{" "}
          {isLong ? (
            <Tooltip text={showMotifTooltip}>
              <span
                style={{
                  ...motifStyle,
                  borderBottom: "1px dotted #888",
                  cursor: "zoom-in",
                }}
              >
                {motifDisplay}
              </span>
            </Tooltip>
          ) : (
            <span style={motifStyle}>{motifDisplay}</span>
          )}
        </div>
        <div style={pillStyle}><strong>Size:</strong> {motifSize} bp</div>
      </div>

      {/* Synchronized Metadata Table */}
      <div style={tableWrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Selected Sample</th>
              <th style={thStyle}>Genotype</th>
              <th style={thStyle}>Read Support (A1|A2)</th>
              <th style={thStyle}>Mean Methylation (A1|A2)</th>
            </tr>
          </thead>
          <tbody>
            {selectedIndices.map((idx) => {

              const sampleName = availableSamples[idx]
              // 2. Find the data in row.samples that matches this name
              // This handles cases where row.samples is an object keyed by name or an array
              const sample = Object.values(row.samples || {}).find(s => s.SampleID === sampleName) 
                            || row.samples[idx]; 

              if (!sample) return null;

              return (
                <tr key={idx} style={trStyle}>
                  <td style={sampleNameTdStyle}>{sampleName}</td> {/* Use the master name */}
                  <td style={tdStyle}>{sample.GT || "—"}</td>
                  {/* Read Support - Formats [x, y] to x | y (no decimals) */}
                  <td style={tdStyle}>
                    {(() => {
                      const val = sample.Read_support;
                      if (val === undefined || val === null || val === "" || val === "NA") return "—";
                      
                      // Convert to array if it's a string like "[288, 272]" or a real array
                      let parsed = val;
                      if (typeof val === "string" && val.includes("[")) {
                        try { parsed = JSON.parse(val.replace(/'/g, '"')); } catch { parsed = val; }
                      }

                      // Join with pipe if array, otherwise return value as-is
                      return Array.isArray(parsed) ? parsed.join(" | ") : parsed;
                    })()}
                  </td>
                  <td style={tdStyle}>{formatValue(sample.Mean_meth || sample.meanMeth)}</td>
                </tr>
              );
            })}
            {selectedIndices.length === 0 && (
              <tr>
                <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>
                  No samples selected. Please select samples from the list above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Minimalist & Translucent Styles 
const containerStyle = { width: "100%", maxWidth: "1240px", marginBottom: "25px" };
const headerStyle = { display: "flex", gap: "10px", marginBottom: "12px" };
const pillStyle = { background: "rgba(0,0,0,0.03)", padding: "5px 15px", borderRadius: "100px", fontSize: "12px", color: "#666", border: "1px solid rgba(0,0,0,0.05)" };
const motifStyle = { color: '#328547', fontWeight: 'bold' };
const tableWrapperStyle = { background: "#fff", borderRadius: "8px", border: "1px solid #eee", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" };
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "13px" };
const thStyle = { textAlign: "left", padding: "12px 15px", background: "#fafafa", color: "#999", fontWeight: "600", fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #eee" };
const trStyle = { borderBottom: "1px solid #f9f9f9" };
const tdStyle = { padding: "12px 15px", color: "#444" };
const sampleNameTdStyle = { ...tdStyle, fontFamily: "inherit", fontWeight: "700", color: "#2d5a27" };