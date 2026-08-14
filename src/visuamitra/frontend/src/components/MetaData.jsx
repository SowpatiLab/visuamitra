import React from "react";
import Tooltip from "./motifTooltip"; 

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

export default function MetadataDisplay({
   row, 
   selectedIndices = [], 
   availableSamples = [], 
   isExpanded, 
   onToggle, 
   titleRef,
   forceExpand,
   baseFontSize = 13
}) {

  if (!row || !row.samples) return null;

  const firstAvailable = row.samples[Object.keys(row.samples)[0]] || {};
  const locusID = row.ID || row.id || firstAvailable.ID || firstAvailable.id || "N/A";
  const motif = row.Motif || firstAvailable.Motif || "N/A";
  const motifSize = row.Motif_size || firstAvailable.Motif_size || "—";

  const isLong = motif.length > 20;
  const motifDisplay = isLong ? `${motif.slice(0, 20)}…` : motif;
  const showMotifTooltip = isLong ? `${motif} (length: ${motif.length})` : "";

  const shouldShowAll = isExpanded || forceExpand;
  const itemsToShow = shouldShowAll ? selectedIndices : selectedIndices.slice(0, 3);
  const hasHiddenItems = selectedIndices.length > 3;

  return (
    <div style={{ ...styles.container, fontSize: `${baseFontSize}px` }}>
      
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Selected Sample</th>
              <th style={styles.th}>Genotype</th>
              <th style={styles.th}>Read Support (A1|A2)</th>
              <th style={styles.th}>Mean Methylation (A1|A2)</th>
            </tr>
          </thead>
          <tbody>
            {itemsToShow.map((idx) => {
              const fullSampleName = availableSamples[idx];
              const displayName = fullSampleName ? fullSampleName.split('-')[0] : "Unknown";

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
                  <tr key={idx} style={styles.tr}>
                    <td style={styles.sampleNameTd}>{displayName}</td>
                    <td colSpan="3" style={{ ...styles.td, color: "#999", fontStyle: "italic" }}>
                      Metadata not linked (ID: {fullSampleName || idx})
                    </td>
                  </tr>
                );
              }              

              return (
                <tr key={idx} style={styles.tr}>
                  <td style={styles.sampleNameTd}>{displayName}</td>
                  <td style={styles.td}>{sample.GT || "—"}</td>
                  <td style={styles.td}>
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
                  <td style={styles.td}>{formatValue(sample.Mean_meth || sample.meanMeth)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {hasHiddenItems && !forceExpand && (
          <div style={styles.buttonContainer}>
            <button 
              style={styles.expandButton} 
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
          <div style={{ ...styles.td, textAlign: 'center', color: '#999', padding: '1.25em' }}>
            No samples selected. Please select samples from the list above.
          </div>
        )}
      </div>
      
      <div style={styles.header} ref={titleRef}>
        <div style={styles.pill}><strong>Locus ID:</strong> {locusID}</div>
        <div style={styles.pill}>
          <strong>Motif:</strong>{" "}
          {isLong ? (
            <Tooltip text={showMotifTooltip}>
              <span style={{ ...styles.motif, borderBottom: "0.0625em dotted #888", cursor: "zoom-in" }}>
                {motifDisplay}
              </span>
            </Tooltip>
          ) : (
            <span style={styles.motif}>{motifDisplay}</span>
          )}
        </div>
        <div style={styles.pill}><strong>Size:</strong> {motifSize} bp</div>
      </div>
    </div>
  );
} 

const styles = {
  container: { 
    width: "100%", 
    maxWidth: "100%", // Fixed: expanded to 100% to match BASE_WIDTH (1200px) parent wrapper
    marginBottom: "1.5em" // Fixed: added proper gap spacing below the ideogram
  },
  header: { 
    display: "flex", 
    gap: "0.625em", 
    marginBottom: "0px", 
    marginTop: "1.5em", 
    fontSize: "1.25em" 
  },
  pill: { 
    background: "rgba(0,0,0,0.03)", 
    padding: "0.3125em 0.9375em", 
    borderRadius: "6.25em", 
    fontSize: "0.95em", 
    color: "#222", 
    border: "0.0625em solid rgba(0,0,0,0.05)" 
  },
  motif: { 
    color: '#328547', 
    fontWeight: 'bold' 
  },
  tableWrapper: { 
    background: "#fff", 
    borderRadius: "0.5em", 
    border: "0.0625em solid #eee", 
    overflow: "hidden", 
    boxShadow: "0 0.125em 0.5em rgba(0,0,0,0.02)" 
  },
  table: { 
    width: "100%", 
    borderCollapse: "collapse", 
    fontSize: "inherit" 
  },
  th: { 
    textAlign: "left", 
    padding: "0.75em 0.9375em", 
    background: "#fafafa", 
    color: "#666", 
    fontWeight: "800", 
    fontSize: "0.8em", 
    textTransform: "uppercase", 
    borderBottom: "0.0625em solid #eee" 
  },
  tr: { 
    borderBottom: "0.0625em solid #f9f9f9" 
  },
  td: { 
    padding: "0.75em 0.9375em", 
    color: "#444" 
  },
  sampleNameTd: { 
    padding: "0.75em 0.9375em", 
    fontFamily: "inherit", 
    fontWeight: "700", 
    color: "#2d5a27" 
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "center", 
    padding: "0.25em 0", 
    background: "#fff",
    borderTop: "0.0625em solid #f0f0f0" 
  },
  expandButton: {
    padding: "0.3125em 0.9375em", 
    background: "#f8faf8",
    border: "0.0625em solid #d0e0d0", 
    borderRadius: "1em", 
    color: "#2d5a27",
    fontSize: "0.9em",         
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    boxShadow: "0 0.0625em 0.1875em rgba(0,0,0,0.05)" 
  }
};