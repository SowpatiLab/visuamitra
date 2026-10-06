import React, { useState, useEffect } from "react";

export default function CutoffModal({ 
  isOpen, 
  onClose, 
  cutoffs = {}, 
  defaultCutoffs = {}, 
  motif = "",
  onApply, 
  onRestore, 
  baseFontSize = 18 
}) {
  const [benignMax, setBenignMax] = useState("");
  const [interMin, setInterMin] = useState("");
  const [interMax, setInterMax] = useState("");
  const [pathMin, setPathMin] = useState("");

  const motifLen = motif ? motif.length : 0;

  // Helper to verify if a numeric value is valid (including 0)
  const isValidVal = (val) => val !== undefined && val !== null && val !== "" && val !== "NA" && !isNaN(val);

  useEffect(() => {
    if (isOpen) {
      setBenignMax(isValidVal(cutoffs?.benignMax) ? cutoffs.benignMax : "");
      setInterMin(isValidVal(cutoffs?.interMin) ? cutoffs.interMin : "");
      setInterMax(isValidVal(cutoffs?.interMax) ? cutoffs.interMax : "");
      setPathMin(isValidVal(cutoffs?.pathMin) ? cutoffs.pathMin : "");
    }
  }, [isOpen, cutoffs]);

  if (!isOpen) return null;

  // Relative font sizes matching larger baseFontSize
  const labelFontSizeEm = "0.9em";
  const smallTextFontSizeEm = "0.8em";
  const headerFontSizeEm = "1.25em";

  const formatBpHelper = (repeats) => {
    if (!isValidVal(repeats)) return "";
    const num = Number(repeats);
    if (motifLen > 0) {
      return `${num} units (~${num * motifLen} bp)`;
    }
    return `${num} units`;
  };

  const handleApply = () => {
    onApply({
      benignMax: benignMax === "" ? null : Number(benignMax),
      interMin: interMin === "" ? null : Number(interMin),
      interMax: interMax === "" ? null : Number(interMax),
      pathMin: pathMin === "" ? null : Number(pathMin),
    });
    onClose();
  };

  const handleRestoreDefaults = () => {
    // Clear field values so grey default placeholders show up
    setBenignMax("");
    setInterMin("");
    setInterMax("");
    setPathMin("");
    
    // Notify parent to reset saved cutoffs without closing the modal
    if (onRestore) {
      onRestore();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(3px)"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "0.65em",
          padding: "1.75em",
          width: "36vw",
          minWidth: "420px",
          maxWidth: "650px",
          boxShadow: "0 0.75em 1.5em rgba(0,0,0,0.18)",
          border: "0.0625em solid #cbd5e1",
          display: "flex",
          flexDirection: "column",
          gap: "1.25em",
          fontSize: `${baseFontSize / 16}rem`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: headerFontSizeEm, color: "#0f172a", fontWeight: "700", lineHeight: 1.25 }}>
              Pathogenicity Repeat Cutoffs
            </h3>
            {motif && (
              <span style={{ fontSize: labelFontSizeEm, color: "#64748b", marginTop: "0.25em", display: "inline-block" }}>
                Motif: <strong>{motif}</strong> ({motifLen} bp per unit)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5em",
              cursor: "pointer",
              color: "#94a3b8",
              fontWeight: "bold",
              lineHeight: 1,
              padding: "0 0.2em"
            }}
          >
            ×
          </button>
        </div>

        {/* Inputs Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2em" }}>
          
          {/* Benign Max */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35em" }}>
            <label style={{ fontSize: labelFontSizeEm, fontWeight: "600", color: "#334155" }}>
              Benign Max (Units)
            </label>
            <input
              type="number"
              placeholder={isValidVal(defaultCutoffs?.benignMax) ? `Default: ${defaultCutoffs.benignMax}` : "N/A"}
              value={benignMax}
              onChange={(e) => setBenignMax(e.target.value)}
              style={inputStyle(labelFontSizeEm)}
            />
            <span style={{ fontSize: smallTextFontSizeEm, color: "#64748b" }}>
              {benignMax !== "" 
                ? formatBpHelper(benignMax) 
                : isValidVal(defaultCutoffs?.benignMax) ? `Default: ${formatBpHelper(defaultCutoffs.benignMax)}` : "≤ threshold is Benign"}
            </span>
          </div>

          {/* Intermediate Min */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35em" }}>
            <label style={{ fontSize: labelFontSizeEm, fontWeight: "600", color: "#334155" }}>
              Inter. Min (Units)
            </label>
            <input
              type="number"
              placeholder={isValidVal(defaultCutoffs?.interMin) ? `Default: ${defaultCutoffs.interMin}` : "N/A"}
              value={interMin}
              onChange={(e) => setInterMin(e.target.value)}
              style={inputStyle(labelFontSizeEm)}
            />
            <span style={{ fontSize: smallTextFontSizeEm, color: "#64748b" }}>
              {interMin !== "" 
                ? formatBpHelper(interMin) 
                : isValidVal(defaultCutoffs?.interMin) ? `Default: ${formatBpHelper(defaultCutoffs.interMin)}` : "Start of intermediate zone"}
            </span>
          </div>

          {/* Intermediate Max */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35em" }}>
            <label style={{ fontSize: labelFontSizeEm, fontWeight: "600", color: "#334155" }}>
              Inter. Max (Units)
            </label>
            <input
              type="number"
              placeholder={isValidVal(defaultCutoffs?.interMax) ? `Default: ${defaultCutoffs.interMax}` : "N/A"}
              value={interMax}
              onChange={(e) => setInterMax(e.target.value)}
              style={inputStyle(labelFontSizeEm)}
            />
            <span style={{ fontSize: smallTextFontSizeEm, color: "#64748b" }}>
              {interMax !== "" 
                ? formatBpHelper(interMax) 
                : isValidVal(defaultCutoffs?.interMax) ? `Default: ${formatBpHelper(defaultCutoffs.interMax)}` : "End of intermediate zone"}
            </span>
          </div>

          {/* Pathogenic Min */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35em" }}>
            <label style={{ fontSize: labelFontSizeEm, fontWeight: "600", color: "#334155" }}>
              Pathogenic Min (Units)
            </label>
            <input
              type="number"
              placeholder={isValidVal(defaultCutoffs?.pathMin) ? `Default: ${defaultCutoffs.pathMin}` : "N/A"}
              value={pathMin}
              onChange={(e) => setPathMin(e.target.value)}
              style={inputStyle(labelFontSizeEm)}
            />
            <span style={{ fontSize: smallTextFontSizeEm, color: "#64748b" }}>
              {pathMin !== "" 
                ? formatBpHelper(pathMin) 
                : isValidVal(defaultCutoffs?.pathMin) ? `Default: ${formatBpHelper(defaultCutoffs.pathMin)}` : "≥ threshold is Pathogenic"}
            </span>
          </div>

        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75em" }}>
          <button
            onClick={handleRestoreDefaults}
            style={{
              background: "#f1f5f9",
              color: "#334155",
              border: "0.0625em solid #cbd5e1",
              borderRadius: "0.3em",
              padding: "0.5em 0.9em",
              fontSize: labelFontSizeEm,
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Restore Defaults
          </button>

          <button
            onClick={handleApply}
            style={{
              background: "#328547",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.3em",
              padding: "0.5em 1.25em",
              fontSize: labelFontSizeEm,
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = (fontSize) => ({
  padding: "0.5em 0.75em",
  fontSize: fontSize,
  fontWeight: "600",
  color: "#0f172a",
  border: "0.0625em solid #cbd5e1",
  borderRadius: "0.3em",
  background: "#ffffff",
  outline: "none"
});