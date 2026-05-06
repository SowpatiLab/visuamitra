import React from "react";
import Tooltip from "./motifTooltip"; 

// Helper to format values like [288, 272] or 0.856
const formatValue = (val) => {
  if (val === undefined || val === null || val === "" || val === "NA") return "—";
  let parsed = val;
  if (typeof val === "string" && val.includes("[")) {
    try { 
      parsed = JSON.parse(val.replace(/'/g, '"')); 
    } catch { 
      parsed = val; 
    }
  }
  if (Array.isArray(parsed)) {
    return parsed.map(v => (typeof v === 'number' ? v.toFixed(2) : v)).join(" | ");
  }
  return typeof parsed === 'number' ? parsed.toFixed(2) : parsed;
};

export default function MetadataDisplay({ row, selectedIndices = [], availableSamples = [], isExpanded, onToggle }) {

  // Safeguard: if data hasn't loaded yet
  if (!row || !row.samples) return null;

  // Global Data (Top Pills)
  const firstAvailable = row.samples[Object.keys(row.samples)[0]] || {};
  const locusID = row.ID || row.id || firstAvailable.ID || firstAvailable.id || "N/A";
  const motif = row.Motif || firstAvailable.Motif || "N/A";
  const motifSize = row.Motif_size || firstAvailable.Motif_size || "—";

  const isLong = motif.length > 20;
  const motifDisplay = isLong ? `${motif.slice(0, 20)}…` : motif;
  const showMotifTooltip = isLong ? `${motif} (length: ${motif.length})` : "";

  const itemsToShow = isExpanded ? selectedIndices : selectedIndices.slice(0, 3);
  const hasHiddenItems = selectedIndices.length > 3;

  return (
    <div style={containerStyle}>
      

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
            {itemsToShow.map((idx) => {
              const fullSampleName = availableSamples[idx];
              
              // Use this ONLY for the text in the <td>
              const displayName = fullSampleName ? fullSampleName.split('-')[0] : "Unknown";

              // Lookup using the full name which matches the backend TSV exactly
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

              if (!sample || typeof sample !== 'object') {
                return (
                  <tr key={idx} style={trStyle}>
                    <td style={sampleNameTdStyle}>{displayName}</td>
                    <td colSpan="3" style={{ ...tdStyle, color: "#999", fontStyle: "italic" }}>
                      Metadata not linked (ID: {fullSampleName || idx})
                    </td>
                  </tr>
                );
              }              

              return (
                <tr key={idx} style={trStyle}>
                  <td style={sampleNameTdStyle}>{displayName}</td>
                  <td style={tdStyle}>{sample.GT || "—"}</td>
                  <td style={tdStyle}>
                    {(() => {
                        const val = sample.Read_support;
                        if (!val || val === "NA") return "—";
                        let parsed = val;
                        if (typeof val === "string" && val.includes("[")) {
                            try { parsed = JSON.parse(val.replace(/'/g, '"')); } catch { parsed = val; }
                        }
                        return Array.isArray(parsed) ? parsed.join(" | ") : parsed;
                    })()}
                  </td>
                  <td style={tdStyle}>{formatValue(sample.Mean_meth || sample.meanMeth)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* COMPACT BUTTON FOOTER */}
        {hasHiddenItems && (
          <div style={buttonContainerStyle}>
            <button 
              style={expandButtonStyle} 
              onClick={onToggle}
            >
              {isExpanded ? (
                <span>Show Less ▲</span>
              ) : (
                <span>Show {selectedIndices.length - 3} More Samples ▽</span>
              )}
            </button>
          </div>
        )}

        {selectedIndices.length === 0 && (
          <div style={{ ...tdStyle, textAlign: 'center', color: '#999', padding: '20px' }}>
            No samples selected. Please select samples from the list above.
          </div>
        )}
      </div>
      <div style={headerStyle}>
        <div style={pillStyle}><strong>Locus ID:</strong> {locusID}</div>
        <div style={pillStyle}>
          <strong>Motif:</strong>{" "}
          {isLong ? (
            <Tooltip text={showMotifTooltip}>
              <span style={{ ...motifStyle, borderBottom: "1px dotted #888", cursor: "zoom-in" }}>
                {motifDisplay}
              </span>
            </Tooltip>
          ) : (
            <span style={motifStyle}>{motifDisplay}</span>
          )}
        </div>
        <div style={pillStyle}><strong>Size:</strong> {motifSize} bp</div>
      </div>
    </div>
    
  );
}

// Styles 

const buttonContainerStyle = {
  display: "flex",
  justifyContent: "center", 
  padding: "4px 0",       // Vertical breathing room
  background: "#fff",
  borderTop: "1px solid #f0f0f0"
};

const expandButtonStyle = {
  padding: "5px 15px",     
  background: "#f8faf8",    // Very subtle green tint
  border: "1px solid #d0e0d0",
  borderRadius: "16px",     
  color: "#2d5a27",
  fontSize: "11px",         
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.2s ease",
  display: "inline-flex",
  alignItems: "center",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)" 
};

const containerStyle = { width: "100%", maxWidth: "1240px", marginBottom: "-25px" };
const headerStyle = { display: "flex", gap: "10px", marginBottom: "0px", marginTop: "24px"};
const pillStyle = { background: "rgba(0,0,0,0.03)", padding: "5px 15px", borderRadius: "100px", fontSize: "12px", color: "#222", border: "1px solid rgba(0,0,0,0.05)" };
const motifStyle = { color: '#328547', fontWeight: 'bold' };
const tableWrapperStyle = { background: "#fff", borderRadius: "8px", border: "1px solid #eee", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" };
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "13px" };
const thStyle = { textAlign: "left", padding: "12px 15px", background: "#fafafa", color: "#999", fontWeight: "600", fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #eee" };
const trStyle = { borderBottom: "1px solid #f9f9f9" };
const tdStyle = { padding: "12px 15px", color: "#444" };
const sampleNameTdStyle = { ...tdStyle, fontFamily: "inherit", fontWeight: "700", color: "#2d5a27" };