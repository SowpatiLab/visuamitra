import React, { useState, useRef, useEffect } from "react";

const MOTIF_PALETTES = ["Set1", "Set2", "Set3", "Paired", "Pastel1", "Pastel2", "Dark2", "Accent", "Tableau", "Observable10"];
const METHYLATION_SCALES = ["viridis", "plasma", "magma", "cividis"];

const FONTS = [
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Roboto", value: "Roboto, sans-serif" },
  { name: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { name: "Courier New", value: "'Courier New', Courier, monospace" },
  { name: "SF Mono", value: "SFMono-Regular, Consolas, monospace" },
  { name: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Playfair Display", value: "'Playfair Display', serif" }
];

export default function SettingsPanel({ settings, onChange, onClose }) {
  const [palette, setPalette] = useState(settings.palette || "Observable10");
  const [font, setFont] = useState(settings.font || "Arial, sans-serif");
  const [theme, setTheme] = useState(settings.theme || "light");
  const [methPalette, setMethPalette] = useState(settings.methPalette || "viridis");
  const [fontSize, setFontSize] = useState(settings.baseFontSize || 13);
  
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Inject Playfair Display dynamically alongside Roboto
  useEffect(() => {
    if (!document.getElementById("playfair-font-link")) {
      const link = document.createElement("link");
      link.id = "playfair-font-link";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsFontDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePaletteChange = (e) => {
    const val = e.target.value;
    setPalette(val);
    onChange({ ...settings, palette: val });
  };

  const handleFontSelect = (fontValue) => {
    setFont(fontValue);
    setIsFontDropdownOpen(false);
    onChange({ ...settings, font: fontValue });
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

  const handleFontSizeChange = (e) => {
    const val = Math.max(9, Math.min(21, parseInt(e.target.value, 10) || 13));
    setFontSize(val);
    onChange({ ...settings, baseFontSize: val });
  };

  const currentFontObj = FONTS.find(f => f.value === font) || FONTS[0];
  const isDark = theme === "dark";

  // Dynamic relative font unit derivations
  const rootFontSizeRem = `${(fontSize / 16).toFixed(4)}rem`;
  const labelFontSizeEm = `${(12 / fontSize).toFixed(4)}em`;
  const optionFontSizeEm = `${(14 / fontSize).toFixed(4)}em`;
  const arrowFontSizeEm = `${(10 / fontSize).toFixed(4)}em`;
  const closeBtnFontSizeEm = `${(20 / fontSize).toFixed(4)}em`;

  return (
    <div
      style={{
        position: "absolute",
        top: "9.23em",
        right: "6.15em",
        padding: "1.0769em",
        border: isDark ? "0.0769em solid #444" : "0.0769em solid #ccc",
        borderRadius: "0.6154em",
        background: isDark ? "#222" : "#fff",
        color: isDark ? "#fff" : "#000",
        fontFamily: font,
        fontSize: rootFontSizeRem,
        zIndex: 1000,
        width: "16.15em",
        boxShadow: "0 0.3077em 0.9231em rgba(0, 0, 0, 0.15)",
        boxSizing: "border-box"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6154em" }}>
        <h4 style={{ margin: "0 0 0.6154em 0", fontFamily: font, fontSize: "1.15em", fontWeight: "bold" }}>View</h4>
        <button 
          onClick={onClose} 
          style={{ 
            background: "transparent", 
            border: "none", 
            fontSize: closeBtnFontSizeEm, 
            cursor: "pointer", 
            color: isDark ? "#fff" : "#000", 
            marginTop: "-0.5em" 
          }}
        >
          ×
        </button>
      </div>

      {/* Motif Palette */}
      <div style={{ marginBottom: "0.7692em" }}>
        <label style={{ display: "block", marginBottom: "0.3077em", fontSize: labelFontSizeEm, fontWeight: "600" }}>
          Motif Palette:
        </label>
        <select 
          value={palette} 
          onChange={handlePaletteChange} 
          style={{ 
            width: "100%", 
            padding: "0.3077em", 
            fontSize: "1em",
            borderRadius: "0.3077em",
            border: isDark ? "0.0769em solid #555" : "0.0769em solid #ccc",
            background: isDark ? "#333" : "#fff",
            color: isDark ? "#fff" : "#000"
          }}
        >
          {MOTIF_PALETTES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Methylation Color Scale */}
      <div style={{ marginBottom: "0.7692em" }}>
        <label style={{ display: "block", marginBottom: "0.3077em", fontSize: labelFontSizeEm, fontWeight: "600" }}>
          Methylation Scale:
        </label>
        <select 
          value={methPalette} 
          onChange={handleMethPaletteChange} 
          style={{ 
            width: "100%", 
            padding: "0.3077em", 
            fontSize: "1em",
            borderRadius: "0.3077em",
            border: isDark ? "0.0769em solid #555" : "0.0769em solid #ccc",
            background: isDark ? "#333" : "#fff",
            color: isDark ? "#fff" : "#000"
          }}
        >
          {METHYLATION_SCALES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Font */}
      <div style={{ marginBottom: "0.7692em", position: "relative" }} ref={dropdownRef}>
        <label style={{ display: "block", marginBottom: "0.3077em", fontSize: labelFontSizeEm, fontWeight: "600" }}>
          Font Style:
        </label>
        
        <div 
          onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
          style={{
            padding: "0.4615em 0.7692em",
            border: isDark ? "0.0769em solid #555" : "0.0769em solid #999",
            borderRadius: "0.3077em",
            background: isDark ? "#333" : "#f9f9f9",
            cursor: "pointer",
            fontSize: "1em",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: font
          }}
        >
          <span>{currentFontObj.name}</span>
          <span style={{ fontSize: arrowFontSizeEm, transform: isFontDropdownOpen ? "rotate(180deg)" : "none" }}>▼</span>
        </div>

        {/* Custom Font Options Container */}
        {isFontDropdownOpen && (
          <div 
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: isDark ? "#2a2a2a" : "#ffffff",
              border: isDark ? "0.0769em solid #555" : "0.0769em solid #ccc",
              borderRadius: "0.3077em",
              marginTop: "0.3077em",
              maxHeight: "15.38em",
              overflowY: "auto",
              zIndex: 1010,
              boxShadow: "0 0.3077em 0.7692em rgba(0,0,0,0.2)"
            }}
          >
            {FONTS.map((f) => (
              <div
                key={f.value}
                onClick={() => handleFontSelect(f.value)}
                style={{
                  padding: "0.6154em 0.7692em",
                  cursor: "pointer",
                  fontFamily: f.value,
                  fontSize: optionFontSizeEm,
                  background: font === f.value ? (isDark ? "#444" : "#e6f7ff") : "transparent",
                  color: isDark ? "#fff" : "#333",
                  borderBottom: isDark ? "0.0769em solid #3a3a3a" : "0.0769em solid #f0f0f0"
                }}
                onMouseEnter={(e) => e.target.style.background = isDark ? "#3c3c3c" : "#f5f5f5"}
                onMouseLeave={(e) => e.target.style.background = font === f.value ? (isDark ? "#444" : "#e6f7ff") : "transparent"}
              >
                {f.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Numeric Font Size Input */}
      <div style={{ marginBottom: "0.3077em" }}>
        <label style={{ display: "block", marginBottom: "0.3077em", fontSize: labelFontSizeEm, fontWeight: "600" }}>
          Font Size (px):
        </label>
        <input 
          type="number" 
          value={fontSize} 
          onChange={handleFontSizeChange} 
          min="10" 
          max="30"
          style={{ 
            width: "100%", 
            padding: "0.3846em 0.4615em", 
            boxSizing: "border-box", 
            borderRadius: "0.3077em", 
            border: isDark ? "0.0769em solid #555" : "0.0769em solid #ccc",
            background: isDark ? "#333" : "#fff",
            color: isDark ? "#fff" : "#000",
            fontSize: "1em"
          }} 
        />
      </div>
    </div>
  );
}

export { MOTIF_PALETTES, FONTS, METHYLATION_SCALES };