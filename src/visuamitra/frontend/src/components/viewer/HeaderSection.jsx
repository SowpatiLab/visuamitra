import React, { useState, useRef, useEffect } from "react";
import favicon from '../../assets/favicon.png';

// Helper: Highlight text matching query 
function highlightMatch(text, query) {
  if (!query) return text;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = t.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: "#328547" }}>{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

// Sub1- LogoPanel
const LogoPanel = () => (
  <div style={logoContainerStyle}>
    <img src={favicon} alt="Logo" style={logoImageStyle} />
  </div>
);

// Sub2: FilterToolbar 
const FilterToolbar = ({ 
  chr, setChr, start, setStart, endPos, setEndPos, onApply, loading, rows, setError
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filter unique Chromosome names based on input
  const suggestions = React.useMemo(() => {
    const uniqueChroms = new Set();
    (rows || []).forEach(r => {
      if (r?.Chrom && r.Chrom !== "Chrom") {
        uniqueChroms.add(r.Chrom);
      }
    });

    return Array.from(uniqueChroms)
      .filter(c => c.toLowerCase().includes(chr.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) 
      .slice(0, 10);
  }, [rows, chr]);

  const handleSelect = (chromName) => {
    setChr(chromName);
    setStart(""); 
    setEndPos("");
    setOpen(false);
    if (setError) setError(null);
  };

  return (
    <div style={filterToolbarStyle}>
      <span style={{ fontWeight: 600 }}>Genomic Region:</span>
      
      {/* Searchable Chromosome Container */}
      <div ref={dropdownRef} style={{ position: "relative" }}>
        <input 
          placeholder="chr" 
          value={chr} 
          onChange={(e) => { setChr(e.target.value); 
                            setOpen(true); 
                            if (setError) setError(null); }} 
          onFocus={() => setOpen(true)}
          style={inputStyle("6.25em")} 
        />
        
        {open && suggestions.length > 0 && (
          <div style={dropdownStyle}>
            {suggestions.map((chromName, i) => (
              <div 
                key={i} 
                onClick={() => handleSelect(chromName)}
                style={itemStyle}
                onMouseEnter={(e) => e.target.style.background = "#f0fbfd"}
                onMouseLeave={(e) => e.target.style.background = "transparent"}
              >
                {highlightMatch(chromName, chr)} 
              </div>
            ))}
          </div>
        )}
      </div>

      <input 
        type="number" placeholder="start" value={start} 
        onChange={(e) => { setStart(e.target.value); if (setError) setError(null); }} 
        style={inputStyle("6.25em")} 
      />
      <input 
        type="number" placeholder="end" value={endPos} 
        onChange={(e) => { setEndPos(e.target.value); if (setError) setError(null); }} 
        style={inputStyle("6.25em")} 
      />
      
      <button onClick={onApply} disabled={loading} style={applyButtonStyle}>
        {loading ? "Applying..." : "Apply"}
      </button>
    </div>
  );
};

// Main Export
export default function HeaderSection({ 
  chr, setChr, start, setStart, endPos, setEndPos, 
  onApply, loading, error, rows, setError
}) {
  return (
    <div style={parentContainer}>
      <div style={topRowStyle}><LogoPanel /></div>
      <div style={toolbarWrapperStyle}>
        <FilterToolbar 
          chr={chr} setChr={setChr} 
          start={start} setStart={setStart} 
          endPos={endPos} setEndPos={setEndPos} 
          onApply={onApply} 
          loading={loading}
          rows={rows} 
          setError={setError}
        />
      </div>
      {error && <div style={errorTextStyle}>{error}</div>}
    </div>
  );
}

// Styles 
const dropdownStyle = {
  position: "absolute",
  top: "110%",
  left: 0,
  width: "7.5em",
  maxHeight: "12.5em",
  overflowY: "auto",
  background: "#fff",
  border: "0.0625em solid #ccc",
  borderRadius: "0.5em",
  boxShadow: "0 0.25em 0.75em rgba(0,0,0,0.15)",
  zIndex: 100,
  padding: "0.25em 0"
};

const itemStyle = {
  padding: "0.5em 0.75em",
  cursor: "pointer",
  fontSize: "0.8125em",
  borderBottom: "0.0625em solid #f5f5f5",
  transition: "background 0.2s"
};

const parentContainer = {
  width: "100%",
  maxWidth: "75em",
  margin: "0 auto 1.25em auto",
};

const topRowStyle = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  padding: "0 0.625em",
  height: "6.25em", // Provides space for the logo and the toolbar "lift"
};

const logoContainerStyle = {
  background: "#f0fbfd", // Light pastel blue panel
  padding: "0.5em",
  borderRadius: "1.5em",
  border: "0.0625em solid #dcfce7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const logoImageStyle = {
  width: "6.25em",
  height: "6.25em",
  borderRadius: "0.5em",
  objectFit: "contain"
};

const toolbarWrapperStyle = {
  marginTop: "-4.0625em", // THIS PUSHES THE TOOLBAR UPWARDS
  display: "flex",
  justifyContent: "center",
  position: "relative", // Ensures it stays above the layout flow
  zIndex: 999
};

const filterToolbarStyle = {
  display: "flex", 
  justifyContent: "center", 
  alignItems: "center", 
  gap: "0.75em", 
  padding: "0.625em 1.25em", 
  border: "0.0625em solid #ddd", 
  borderRadius: "0.75em", 
  background: "#fff", // Pure white to pop against bg
  boxShadow: "0em 0.375em 0.9375em rgba(0,0,0,0.08)", 
  width: "fit-content"
};

const inputStyle = (w) => ({
  width: typeof w === "number" ? `${w / 16}em` : w, 
  padding: "0.375em 0.625em", 
  borderRadius: "0.375em", 
  border: "0.0625em solid #ccc",
  outline: "none"
});

const applyButtonStyle = {
  padding: "0.4375em 1.125em", 
  borderRadius: "0.5em", 
  border: "none", 
  background: "#328547", 
  color: "#fff", 
  fontWeight: "600", 
  cursor: "pointer"
};

const errorTextStyle = {
  color: "#b00020", 
  fontSize: "0.8125em", 
  textAlign: "center", 
  marginTop: "0.75em"
};