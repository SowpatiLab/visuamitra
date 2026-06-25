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

  return (
    <div
      style={{
        position: "absolute",
        top: 120,
        right: 80,
        padding: 14,
        border: isDark ? "1px solid #444" : "1px solid #ccc",
        borderRadius: 8,
        background: isDark ? "#222" : "#fff",
        color: isDark ? "#fff" : "#000",
        fontFamily: font,
        zIndex: 1000,
        width: 210,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ margin: "0 0 8px 0", fontFamily: font }}>View</h4>
        <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: isDark ? "#fff" : "#000", marginTop: -10 }}>×</button>
      </div>

      {/* Motif Palette */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: "block", marginBottom: 4, fontSize: "12px", fontWeight: "600" }}>Motif Palette:</label>
        <select value={palette} onChange={handlePaletteChange} style={{ width: "100%", padding: "4px" }}>
          {MOTIF_PALETTES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Methylation Color Scale */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: "block", marginBottom: 4, fontSize: "12px", fontWeight: "600" }}>Methylation Scale:</label>
        <select value={methPalette} onChange={handleMethPaletteChange} style={{ width: "100%", padding: "4px" }}>
          {METHYLATION_SCALES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Font */}
      <div style={{ marginBottom: 10, position: "relative" }} ref={dropdownRef}>
        <label style={{ display: "block", marginBottom: 4, fontSize: "12px", fontWeight: "600" }}>Font Style:</label>
        
        <div 
          onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
          style={{
            padding: "6px 10px",
            border: "1px solid #999",
            borderRadius: "4px",
            background: isDark ? "#333" : "#f9f9f9",
            cursor: "pointer",
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: font
          }}
        >
          <span>{currentFontObj.name}</span>
          <span style={{ fontSize: "10px", transform: isFontDropdownOpen ? "rotate(180deg)" : "none" }}>▼</span>
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
              border: isDark ? "1px solid #555" : "1px solid #ccc",
              borderRadius: "4px",
              marginTop: "4px",
              maxHeight: "200px",
              overflowY: "auto",
              zIndex: 1010,
              boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
            }}
          >
            {FONTS.map((f) => (
              <div
                key={f.value}
                onClick={() => handleFontSelect(f.value)}
                style={{
                  padding: "8px 10px",
                  cursor: "pointer",
                  fontFamily: f.value,
                  fontSize: "14px",
                  background: font === f.value ? (isDark ? "#444" : "#e6f7ff") : "transparent",
                  color: isDark ? "#fff" : "#333",
                  borderBottom: isDark ? "1px solid #3a3a3a" : "1px solid #f0f0f0"
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
      <div style={{ marginBottom: 4 }}>
        <label style={{ display: "block", marginBottom: 4, fontSize: "12px", fontWeight: "600" }}>Font Size (px):</label>
        <input 
          type="number" 
          value={fontSize} 
          onChange={handleFontSizeChange} 
          min="9" 
          max="21"
          style={{ 
            width: "100%", 
            padding: "5px 6px", 
            boxSizing: "border-box", 
            borderRadius: "4px", 
            border: isDark ? "1px solid #555" : "1px solid #ccc",
            background: isDark ? "#333" : "#fff",
            color: isDark ? "#fff" : "#000"
          }} 
        />
      </div>
    </div>
  );
}

export { MOTIF_PALETTES, FONTS, METHYLATION_SCALES };