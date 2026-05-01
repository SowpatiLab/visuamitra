import React, { useMemo } from "react";
import { getMethylationColorFactory, getCanonicalMotif } from "../utils/colorUtils";

export default function Legend({ colorMap, refMotif, hasDecomposition, hasAmbiguousMeth, methPalette, methThreshold, showMethylation }) {
  // Collapse redundant motifs into a unique list
  const canonicalMotifs = useMemo(() => {
    if (!colorMap) return [];
    
    // Since colorMap keys are already canonical from Viewer.js,
    // we just need to convert the object to a sorted array.
    return Object.entries(colorMap)
      .filter(([motif]) => motif !== "Non-repetitive seq") // safety filter
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [colorMap]);
  
  const getMethylationColor = useMemo(() => {
    return getMethylationColorFactory(methPalette);
  }, [methPalette]);

  const gradientSteps = 20;
  const gradientArray = Array.from({ length: gradientSteps }, (_, i) =>
    getMethylationColor((i / (gradientSteps - 1)) * 100)
  );

  // If neither mode is active, hide the whole box
  if (!hasDecomposition && !methPalette) return null;

  return (
    <div
      className="legend-container"
      style={{
        marginTop: "20px",
        padding: "12px",
        border: "1px solid #dad8d8ff",
        borderRadius: "6px",
        background: "#fff",
        fontSize: "14px",
        display: "flex",
        flexDirection: "column",
        height: "fit-content", 
        width: "200px", 
        boxShadow: "0px 4px 6px rgba(0,0,0,0.1)"
      }}
    >
      {/* 1. Motif Legend Section (Decomposition Tab) */}
      {hasDecomposition && (
        <div style={{ paddingBottom: "12px" }}>
          <div style={{ fontWeight: "600", marginBottom: "8px", fontSize: "13px", color: "#333" }}>
            Motifs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {canonicalMotifs.map(([motif, color]) => (
              <div key={motif} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: "16px", height: "16px", background: color, border: "1px solid #444", marginRight: "8px", borderRadius: "2px" }} />
                <span style={{ fontSize: "13px" }}>{motif}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: "16px", height: "16px", background: "#bdbdbd", border: "1px solid #444", marginRight: "8px", borderRadius: "2px" }} />
              <span style={{ fontSize: "13px" }}>Non-repetitive seq</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Methylation Section (Methylation Tab) */}
      {(showMethylation && methPalette) && (
        <div style={{ paddingTop: hasDecomposition ? "12px" : "0px" }}>
          <div style={{ fontWeight: "600", marginBottom: "8px", fontSize: "13px", color: "#333" }}>
            Methylation Level %
          </div>
          <div
            style={{
              height: "12px",
              width: "100%",
              background: `linear-gradient(to right, ${gradientArray.join(", ")})`,
              border: "1px solid #444",
              marginBottom: "4px",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#222" }}>
            <span>0</span><span>50</span><span>100</span>
          </div>

          {/* Ambiguous state: Only shows if prop is true */}
          {hasAmbiguousMeth && (
            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
              <div style={{ width: "8px", height: "16px", border: "1px solid #888", background: "rgba(200,200,200,0.25)", marginRight: "8px" }} />
              Ambiguous state
            </div>
          )}

          {/* Methylation Cutoff: Only shows if threshold exists */}
          {methThreshold && (
            <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#333" }}>
                Methylation-Cutoff
              </span>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#fff", backgroundColor: "#328547", padding: "2px 8px", borderRadius: "4px" }}>
                {methThreshold}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}