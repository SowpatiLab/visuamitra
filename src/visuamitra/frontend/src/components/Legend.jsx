import React, { useMemo, useState } from "react";
import { getMethylationColorFactory, getCanonicalMotif } from "../utils/colorUtils";

export default function Legend({
   colorMap, refMotif, hasDecomposition, hasAmbiguousMeth, methPalette, methThreshold, showMethylation, 
   paletteSwatches = [], overrideColor, onOverrideColorChange 
}) {
  const canonicalMotifs = useMemo(() => {
    if (!colorMap) return [];
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

  const [showColorPicker, setShowColorPicker] = useState(false);

  // If neither mode is active, hide whole box
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
      {/* Motif Legend */}
      {hasDecomposition && (
        <div style={{ paddingBottom: "12px" }}>
          <div style={{ fontWeight: "600", marginBottom: "8px", fontSize: "13px", color: "#333" }}>
            Motifs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {canonicalMotifs.map(([motif, color]) => {
              const canonicalRef = refMotif ? getCanonicalMotif(refMotif, refMotif) : "";
              const isExpectedMotif = motif === canonicalRef;

              return (
                <div key={motif} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div 
                        style={{ 
                          width: "16px", 
                          height: "16px", 
                          background: color, 
                          border: "1px solid #444", 
                          marginRight: "8px", 
                          borderRadius: "2px",
                          cursor: isExpectedMotif ? "pointer" : "default" 
                        }} 
                        onClick={() => isExpectedMotif && setShowColorPicker(!showColorPicker)}
                        title={isExpectedMotif ? "Click to change expected motif color" : ""}
                      />
                      <span style={{ fontSize: "13px", fontWeight: isExpectedMotif ? "bold" : "normal" }}>
                        {motif} {isExpectedMotif}
                      </span>
                    </div>

                    {isExpectedMotif && (
                      <button 
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        style={{
                          background: "none", border: "none", color: "#328547", fontSize: "12px", 
                          cursor: "pointer", padding: "2px 4px", fontWeight: "600"
                        }}
                      >
                        {showColorPicker ? "close" : "color 🎨"}
                      </button>
                    )}
                  </div>

                  {/* Swatch Picker Dropdown */}
                  {isExpectedMotif && showColorPicker && (
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(5, 1fr)", 
                      gap: "4px", 
                      background: "#fdfdfd", 
                      padding: "6px", 
                      border: "1px solid #eee", 
                      borderRadius: "4px",
                      marginTop: "2px"
                    }}>
                      {paletteSwatches.map((swatchColor) => (
                        <div
                          key={swatchColor}
                          onClick={() => onOverrideColorChange(swatchColor)}
                          style={{
                            height: "18px",
                            background: swatchColor,
                            borderRadius: "2px",
                            cursor: "pointer",
                            border: color === swatchColor ? "2px solid #000" : "1px solid #ccc",
                            boxSizing: "border-box"
                          }}
                          title={swatchColor}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: "16px", height: "16px", background: "#bdbdbd", border: "1px solid #444", marginRight: "8px", borderRadius: "2px" }} />
              <span style={{ fontSize: "13px" }}>Non-repetitive seq</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Meth Legend */}
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