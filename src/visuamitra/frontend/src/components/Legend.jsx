import React, { useMemo, useState } from "react";
import { getMethylationColorFactory, getCanonicalMotif } from "../utils/colorUtils";

export default function Legend({
   colorMap, 
   refMotif, 
   hasDecomposition, 
   hasAmbiguousMeth, 
   methPalette, 
   methThreshold, 
   showMethylation, 
   paletteSwatches = [], 
   overrideColor, 
   onOverrideColorChange,
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

  // RELATIVE SCALING CALCULATIONS
  const rootFontSizeRem = `${(baseFontSize / 16).toFixed(4)}rem`;
  const boxDimensionEm = `${(Math.max(12, baseFontSize - 1) / baseFontSize).toFixed(4)}em`;
  const internalGradHeightEm = `${(Math.max(65, baseFontSize * 5) / baseFontSize).toFixed(4)}em`;
  
  const headerFontSizeEm = `${(Math.max(10, baseFontSize - 2) / baseFontSize).toFixed(4)}em`;
  const smallTextFontSizeEm = `${(Math.max(9, baseFontSize - 3) / baseFontSize).toFixed(4)}em`;
  const badgeFontSizeEm = `${(Math.max(10, baseFontSize - 1) / baseFontSize).toFixed(4)}em`;

  return (
    <div
      className="legend-container"
      style={{
        marginTop: "1.25em",
        padding: "0.625em 0.75em", 
        border: "0.0625em solid #e2e8f0",
        borderRadius: "0.5em",
        background: "#ffffff",
        fontSize: rootFontSizeRem, 
        display: "flex",
        flexDirection: "column",
        gap: "0.625em",
        height: "fit-content", 
        width: "max-content",    
        minWidth: "7.8125em",       
        maxWidth: "14em", // Dynamically scales with base font size
        boxShadow: "0 0.25em 0.625em rgba(0, 0, 0, 0.04)",
        boxSizing: "border-box"
      }}
    >
      {/* Motif Legend */}
      {hasDecomposition && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375em", minWidth: 0 }}>
          <div style={{ fontWeight: "700", fontSize: headerFontSizeEm, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.038em" }}>
            Motifs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375em", minWidth: 0 }}>
            {canonicalMotifs.map(([motif, color]) => {
              const canonicalRef = refMotif ? getCanonicalMotif(refMotif, refMotif) : "";
              const isExpectedMotif = motif === canonicalRef;

              return (
                <div key={motif} style={{ display: "flex", flexDirection: "column", gap: "0.125em", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.375em", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", minWidth: 0, flexGrow: 1 }}>
                      <div 
                        style={{ 
                          width: boxDimensionEm, 
                          height: boxDimensionEm, 
                          background: color, 
                          border: "0.0625em solid #4a5568", 
                          marginRight: "0.375em", 
                          borderRadius: "0.125em",
                          cursor: isExpectedMotif ? "pointer" : "default",
                          flexShrink: 0
                        }} 
                        onClick={() => isExpectedMotif && setShowColorPicker(!showColorPicker)}
                      />
                      <span style={{ 
                        fontSize: "1em", 
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
                          background: "none", 
                          border: "none", 
                          color: "#328547", 
                          fontSize: smallTextFontSizeEm, 
                          cursor: "pointer", 
                          padding: "0 0.125em", 
                          fontWeight: "700", 
                          flexShrink: 0
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
                        gap: "0.1875em", 
                        background: "#f7fafc", 
                        padding: "0.25em", 
                        border: "0.0625em solid #e2e8f0", 
                        borderRadius: "0.25em",
                        marginTop: "0.125em"
                    }}>
                      {paletteSwatches.map((swatchColor) => (
                        <div
                          key={swatchColor}
                          onClick={() => onOverrideColorChange(swatchColor)}
                          style={{
                            height: "0.875em",
                            background: swatchColor,
                            borderRadius: "0.125em",
                            cursor: "pointer",
                            border: color === swatchColor ? "0.125em solid #1a202c" : "0.0625em solid #cbd5e0",
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
              <div style={{ width: boxDimensionEm, height: boxDimensionEm, background: "#bdbdbd", border: "0.0625em solid #4a5568", marginRight: "0.375em", borderRadius: "0.125em", flexShrink: 0 }} />
              <span style={{ fontSize: "1em", color: "#4a5568", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Non-repetitive seq
              </span>
            </div>
          </div>
          {showMethylation && methPalette && <hr style={{ border: "none", borderTop: "0.0625em solid #edf2f7", margin: "0.25em 0" }} />}
        </div>
      )}

      {/* Meth Legend */}
      {(showMethylation && methPalette) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375em" }}>
          <div style={{ fontWeight: "700", fontSize: headerFontSizeEm, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.038em" }}>
            Methylation Level
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.5em", paddingLeft: "0.125em" }}>
            <div
              style={{
                height: internalGradHeightEm, 
                width: "0.75em",  
                background: `linear-gradient(to bottom, ${gradientArray.join(", ")})`,
                border: "0.0625em solid #4a5568",
                borderRadius: "0.125em",
                flexShrink: 0
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: internalGradHeightEm, fontSize: smallTextFontSizeEm, fontWeight: "600", color: "#4a5568", lineHeight: "1" }}>
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>
          </div>

          {/* Ambiguous State Flag */}
          {hasAmbiguousMeth && (
            <div style={{ marginTop: "0.125em", display: "flex", alignItems: "center", fontSize: badgeFontSizeEm, color: "#718096", minWidth: 0 }}>
              <div style={{ width: boxDimensionEm, height: boxDimensionEm, border: "0.0625em dashed #718096", background: "rgba(226, 232, 240, 0.6)", marginRight: "0.375em", borderRadius: "0.125em", flexShrink: 0 }} />
              <span style={{ fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Ambiguous state</span>
            </div>
          )}

          {/* Cutoff Badge */}
          {methThreshold && (
            <div style={{ marginTop: "0.25em", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f7fafc", padding: "0.25em 0.375em", borderRadius: "0.25em", border: "0.0625em solid #edf2f7", width: "100%", boxSizing: "border-box" }}>
              <span style={{ fontSize: smallTextFontSizeEm, fontWeight: "600", color: "#4a5568" }}>
                Cutoff
              </span>
              <span style={{ fontSize: smallTextFontSizeEm, fontWeight: "700", color: "#fff", backgroundColor: "#328547", padding: "0.0625em 0.25em", borderRadius: "0.1875em", flexShrink: 0 }}>
                {methThreshold}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}