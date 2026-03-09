import React, { useMemo } from "react";
import { getMethylationColorFactory } from "../utils/colorUtils";

export default function Legend({ colorMap, hasDecomposition, hasAmbiguousMeth, methPalette }) {
  const motifs = Object.entries(colorMap || {});
  
  const getMethylationColor = useMemo(() => {
    return getMethylationColorFactory(methPalette);
  }, [methPalette]);

  const gradientSteps = 20;
  const gradientArray = Array.from({ length: gradientSteps }, (_, i) =>
    getMethylationColor((i / (gradientSteps - 1)) * 100)
  );

  // If absolutely nothing is being displayed, don't even render the box
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
        // The key to dynamic fitting:
        height: "fit-content", 
        width: "200px", // Fixed width but dynamic height
        boxShadow: "0px 4px 6px rgba(0,0,0,0.1)"
      }}
    >
      

      {/* 1. Motif Legend Section */}
      {hasDecomposition && (
        <div style={{ paddingBottom: "12px", borderBottom: methPalette ? "1px dashed #aaa" : "none" }}>
          <div style={{ fontWeight: "600", marginBottom: "8px", fontSize: "13px", color: "#555" }}>
            Motifs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {motifs.map(([motif, color]) => (
              <div key={motif} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: "16px", height: "16px", background: color, border: "1px solid #444", marginRight: "8px", borderRadius: "2px" }} />
                <span style={{ fontSize: "13px" }}>{motif}</span>
              </div>
            ))}
            {/* Non-repeating seq always shown if decomposition is active */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: "16px", height: "16px", background: "#bdbdbd", border: "1px solid #444", marginRight: "8px", borderRadius: "2px" }} />
              <span style={{ fontSize: "13px" }}>Non-repetitive seq</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Methylation Section */}
      {methPalette && (
        <div style={{ paddingTop: hasDecomposition ? "12px" : "0px" }}>
          <div style={{ fontWeight: "600", marginBottom: "8px", fontSize: "13px", color: "#555" }}>
            Methylation Level
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
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#666" }}>
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>

          {/* Ambiguous Methylation Sub-section */}
          {hasAmbiguousMeth && (
            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
              <div style={{ width: "8px", height: "16px", border: "1px solid #888", background: "rgba(200,200,200,0.25)", marginRight: "8px" }} />
              Ambiguous state
            </div>
          )}
        </div>
      )}
    </div>
  );
}