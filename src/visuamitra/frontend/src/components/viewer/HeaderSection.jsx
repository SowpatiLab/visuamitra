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
          style={inputStyle(100)} 
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
        style={inputStyle(100)} 
      />
      <input 
        type="number" placeholder="end" value={endPos} 
        onChange={(e) => { setEndPos(e.target.value); if (setError) setError(null); }} 
        style={inputStyle(100)} 
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
  width: "120px",
  maxHeight: "200px",
  overflowY: "auto",
  background: "#fff",
  border: "1px solid #ccc",
  borderRadius: "8px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  zIndex: 100,
  padding: "4px 0"
};

const itemStyle = {
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: "13px",
  borderBottom: "1px solid #f5f5f5",
  transition: "background 0.2s"
};

const parentContainer = {
  width: "100%",
  maxWidth: "1200px",
  margin: "0 auto 20px auto",
};

const topRowStyle = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  padding: "0 10px",
  height: "100px", // Provides space for the logo and the toolbar "lift"
};

const logoContainerStyle = {
  background: "#f0fbfd", // Light pastel blue panel
  padding: "8px",
  borderRadius: "24px",
  border: "1px solid #dcfce7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const logoImageStyle = {
  width: "100px",
  height: "100px",
  borderRadius: 8,
  objectFit: "contain"
};

const toolbarWrapperStyle = {
  marginTop: "-65px", // THIS PUSHES THE TOOLBAR UPWARDS
  display: "flex",
  justifyContent: "center",
  position: "relative", // Ensures it stays above the layout flow
  zIndex: 999
};

const filterToolbarStyle = {
  display: "flex", 
  justifyContent: "center", 
  alignItems: "center", 
  gap: "12px", 
  padding: "10px 20px", 
  border: "1px solid #ddd", 
  borderRadius: "12px", 
  background: "#fff", // Pure white to pop against bg
  boxShadow: "0px 6px 15px rgba(0,0,0,0.08)", 
  width: "fit-content"
};

const inputStyle = (w) => ({
  width: w, 
  padding: "6px 10px", 
  borderRadius: "6px", 
  border: "1px solid #ccc",
  outline: "none"
});

const applyButtonStyle = {
  padding: "7px 18px", 
  borderRadius: "8px", 
  border: "none", 
  background: "#328547", 
  color: "#fff", 
  fontWeight: "600", 
  cursor: "pointer"
};

const errorTextStyle = {
  color: "#b00020", 
  fontSize: "13px", 
  textAlign: "center", 
  marginTop: "12px"
};