import React, { useMemo, useState } from "react";
import { getMethylationColorFactory, getCanonicalMotif } from "../utils/colorUtils";

export default function Legend({
   colorMap, refMotif, hasDecomposition, hasAmbiguousMeth, methPalette, methThreshold, showMethylation, 
   paletteSwatches = [], overrideColor, onOverrideColorChange,
   baseFontSize = 13 // Receives explicit numeric font-sizes (e.g. 11, 12, 13...)
}) {
  const canonicalMotifs = useMemo(() => {
    if (!colorMap) return [];
    return Object.entries(colorMap)
      .filter(([motif]) => motif !== "Non-repetitive seq") 
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [colorMap]);
  
  const getMethylationColor = useMemo(() => {
    return getMethylationColorFactory(methPalette);
  }, [methPalette]);

  const gradientSteps = 20;
  const gradientArray = Array.from({ length: gradientSteps }, (_, i) =>
    getMethylationColor(((gradientSteps - 1 - i) / (gradientSteps - 1)) * 100)
  );

  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!hasDecomposition && !methPalette) return null;

  // Calculate matching element dimension scales cleanly relative to base user integer 
  const boxDimension = Math.max(12, baseFontSize - 1);
  const internalGradHeight = Math.max(65, baseFontSize * 5);

  return (
    <div
      className="legend-container"
      style={{
        marginTop: "20px",
        padding: "10px 12px", 
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        background: "#ffffff",
        fontSize: `${baseFontSize}px`, 
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        height: "fit-content", 
        width: "max-content",    
        minWidth: "125px",       
        maxWidth: `${baseFontSize * 14}px`, // Dynamically expands max width scale for larger custom sizes
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.04)",
        boxSizing: "border-box"
      }}
    >
      {/* Motif Legend */}
      {hasDecomposition && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
          <div style={{ fontWeight: "700", fontSize: `${Math.max(10, baseFontSize - 2)}px`, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Motifs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
            {canonicalMotifs.map(([motif, color]) => {
              const canonicalRef = refMotif ? getCanonicalMotif(refMotif, refMotif) : "";
              const isExpectedMotif = motif === canonicalRef;

              return (
                <div key={motif} style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", minWidth: 0, flexGrow: 1 }}>
                      <div 
                        style={{ 
                          width: `${boxDimension}px`, 
                          height: `${boxDimension}px`, 
                          background: color, 
                          border: "1px solid #4a5568", 
                          marginRight: "6px", 
                          borderRadius: "2px",
                          cursor: isExpectedMotif ? "pointer" : "default",
                          flexShrink: 0
                        }} 
                        onClick={() => isExpectedMotif && setShowColorPicker(!showColorPicker)}
                      />
                      <span style={{ 
                        fontSize: `${baseFontSize}px`, 
                        fontWeight: isExpectedMotif ? "600" : "normal", 
                        color: "#2d3748",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }} title={motif}>
                        {motif}
                      </span>
                    </div>

                    {isExpectedMotif && (
                      <button 
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        data-html2canvas-ignore="true"
                        style={{
                          background: "none", border: "none", color: "#328547", fontSize: `${Math.max(10, baseFontSize - 3)}px`, 
                          cursor: "pointer", padding: "0 2px", fontWeight: "700", flexShrink: 0
                        }}
                      >
                        {showColorPicker ? "×" : "🎨"}
                      </button>
                    )}
                  </div>

                  {/* Swatch Picker Dropdown */}
                  {isExpectedMotif && showColorPicker && (
                    <div
                      data-html2canvas-ignore="true" 
                      style={{ 
                        display: "grid", 
                        gridTemplateColumns: "repeat(5, 1fr)", 
                        gap: "3px", 
                        background: "#f7fafc", 
                        padding: "4px", 
                        border: "1px solid #e2e8f0", 
                        borderRadius: "4px",
                        marginTop: "2px"
                    }}>
                      {paletteSwatches.map((swatchColor) => (
                        <div
                          key={swatchColor}
                          onClick={() => onOverrideColorChange(swatchColor)}
                          style={{
                            height: "14px",
                            background: swatchColor,
                            borderRadius: "2px",
                            cursor: "pointer",
                            border: color === swatchColor ? "2px solid #1a202c" : "1px solid #cbd5e0",
                            boxSizing: "border-box"
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Non-repetitive seq block */}
            <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
              <div style={{ width: `${boxDimension}px`, height: `${boxDimension}px`, background: "#bdbdbd", border: "1px solid #4a5568", marginRight: "6px", borderRadius: "2px", flexShrink: 0 }} />
              <span style={{ fontSize: `${baseFontSize}px`, color: "#4a5568", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Non-repetitive seq
              </span>
            </div>
          </div>
          {showMethylation && methPalette && <hr style={{ border: "none", borderTop: "1px solid #edf2f7", margin: "4px 0" }} />}
        </div>
      )}

      {/* Meth Legend */}
      {(showMethylation && methPalette) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ fontWeight: "700", fontSize: `${Math.max(10, baseFontSize - 2)}px`, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Methylation Level
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "2px" }}>
            <div
              style={{
                height: `${internalGradHeight}px`, 
                width: "12px",  
                background: `linear-gradient(to bottom, ${gradientArray.join(", ")})`,
                border: "1px solid #4a5568",
                borderRadius: "2px",
                flexShrink: 0
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: `${internalGradHeight}px`, fontSize: `${Math.max(9, baseFontSize - 3)}px`, fontWeight: "600", color: "#4a5568", lineHeight: "1" }}>
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>
          </div>

          {/* Ambiguous State Flag */}
          {hasAmbiguousMeth && (
            <div style={{ marginTop: "2px", display: "flex", alignItems: "center", fontSize: `${Math.max(10, baseFontSize - 1)}px`, color: "#718096", minWidth: 0 }}>
              <div style={{ width: `${boxDimension}px`, height: `${boxDimension}px`, border: "1px dashed #718096", background: "rgba(226, 232, 240, 0.6)", marginRight: "6px", borderRadius: "2px", flexShrink: 0 }} />
              <span style={{ fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Ambiguous state</span>
            </div>
          )}

          {/* Cutoff Badge */}
          {methThreshold && (
            <div style={{ marginTop: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f7fafc", padding: "4px 6px", borderRadius: "4px", border: "1px solid #edf2f7", width: "100%", boxSizing: "border-box" }}>
              <span style={{ fontSize: `${Math.max(9, baseFontSize - 3)}px`, fontWeight: "600", color: "#4a5568" }}>
                Cutoff
              </span>
              <span style={{ fontSize: `${Math.max(9, baseFontSize - 3)}px`, fontWeight: "700", color: "#fff", backgroundColor: "#328547", padding: "1px 4px", borderRadius: "3px", flexShrink: 0 }}>
                {methThreshold}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}