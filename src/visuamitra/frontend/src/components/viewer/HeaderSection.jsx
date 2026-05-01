import React from "react";
import favicon from '../../assets/favicon.png';

// --- Sub-Component 1: LogoPanel (Left-aligned) ---
const LogoPanel = () => (
  <div style={logoContainerStyle}>
    <img 
      src={favicon} 
      alt="Logo" 
      style={logoImageStyle} 
    />
  </div>
);

// --- Sub-Component 2: FilterToolbar (Centered and Pushed Up) ---
const FilterToolbar = ({ chr, setChr, start, setStart, endPos, setEndPos, onApply, loading }) => (
  <div style={filterToolbarStyle}>
    <span style={{ fontWeight: 600 }}>Genomic Region:</span>
    <input placeholder="chr" value={chr} onChange={(e) => setChr(e.target.value)} style={inputStyle(80)} />
    <input type="number" placeholder="start" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle(100)} />
    <input type="number" placeholder="end" value={endPos} onChange={(e) => setEndPos(e.target.value)} style={inputStyle(100)} />
    <button onClick={onApply} disabled={loading} style={applyButtonStyle}>
      {loading ? "Applying..." : "Apply"}
    </button>
  </div>
);

// --- Main Component: HeaderSection ---
export default function HeaderSection({ 
  chr, setChr, start, setStart, endPos, setEndPos, 
  onApply, loading, error 
}) {
  return (
    <div style={parentContainer}>
      
      {/* Top Row: Contains the Logo on the left */}
      <div style={topRowStyle}>
        <LogoPanel />
      </div>

      {/* Toolbar Row: Centered and shifted up via negative margin */}
      <div style={toolbarWrapperStyle}>
        <FilterToolbar 
          chr={chr} setChr={setChr} 
          start={start} setStart={setStart} 
          endPos={endPos} setEndPos={setEndPos} 
          onApply={onApply} 
          loading={loading} 
        />
      </div>
      
      {error && <div style={errorTextStyle}>{error}</div>}
    </div>
  );
}

// --- Styles ---

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
  zIndex: 2
};

const filterToolbarStyle = {
  display: "flex", 
  justifyContent: "center", 
  alignItems: "center", 
  gap: "12px", 
  padding: "10px 20px", 
  border: "1px solid #ddd", 
  borderRadius: "12px", 
  background: "#fff", // Pure white to pop against the background
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