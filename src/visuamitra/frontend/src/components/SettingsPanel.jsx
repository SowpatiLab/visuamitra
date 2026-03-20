import React, { useState } from "react";

const MOTIF_PALETTES = ["Set1", "Set2", "Set3", "Paired", "Pastel1", "Pastel2", "Dark2", "Accent"];
const FONTS = ["Arial", "Roboto", "Courier New", "Times New Roman"];
const METHYLATION_SCALES = [
  "viridis", "plasma", "magma", "cividis", ];

export default function SettingsPanel({ settings, onChange, onClose }) {
  const [palette, setPalette] = useState(settings.palette || "Set3");
  const [font, setFont] = useState(settings.font || "Arial");
  const [theme, setTheme] = useState(settings.theme || "light");

  const [methPalette, setMethPalette] = useState(
    settings.methPalette || "viridis"
    );

  const handlePaletteChange = (e) => {
    const val = e.target.value;
    setPalette(val);
    onChange({ ...settings, palette: val });
  };

  const handleFontChange = (e) => {
    const val = e.target.value;
    setFont(val);
    onChange({ ...settings, font: val });
  };

  const handleThemeChange = (e) => {
    const val = e.target.value;
    setTheme(val);
    onChange({ ...settings, theme: val });
  };

  const handleMethPaletteChange = (e) => {
  const val = e.target.value;
  setMethPalette(val);
  onChange({ ...settings, methPalette: val });
};

  return (
    <div
      style={{
        position: "absolute",
        top: 120,
        right: 80,
        padding: 12,
        border: "1px solid #ccc",
        borderRadius: 8,
        background: theme === "dark" ? "#222" : "#fff",
        color: theme === "dark" ? "#fff" : "#000",
        fontFamily: font,
        zIndex: 1000,
        minWidth: 180,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >

      <h4 style={{ margin: "0 0 8px 0" }}>View</h4>

      {/* Close Button */}
      <div style={{ textAlign: "right" }}>
          <button 
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Motif Palette */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block", marginBottom: 4 }}>Motif Palette:</label>
        <select value={palette} onChange={handlePaletteChange} style={{ width: "100%" }}>
          {MOTIF_PALETTES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Methylation Color Scale */}
        <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block", marginBottom: 4 }}>
            Methylation Scale:
        </label>
        <select
            value={methPalette}
            onChange={handleMethPaletteChange}
            style={{ width: "100%" }}
        >
            {METHYLATION_SCALES.map((p) => (
            <option key={p} value={p}>
                {p}
            </option>
            ))}
        </select>
        </div>

      {/* Font */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block", marginBottom: 4 }}>Font:</label>
        <select value={font} onChange={handleFontChange} style={{ width: "100%" }}>
          {FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Theme 
      <div>
        <label style={{ display: "block", marginBottom: 4 }}>Theme:</label>
        <select value={theme} onChange={handleThemeChange} style={{ width: "100%" }}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>*/}
    </div>
  );
}

export { MOTIF_PALETTES, FONTS, METHYLATION_SCALES };
