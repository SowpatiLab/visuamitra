import React from "react";
import favicon from '../../assets/favicon.png';

export default function HeaderSection({ 
  chr, setChr, start, setStart, endPos, setEndPos, 
  onApply, loading, error 
}) {
  return (
    /* Added margin: "0 auto" and display: "block" to ensure it centers in the parent */
    <div style={{ 
      width: "100%", 
      maxWidth: "1200px", 
      margin: "0 auto 20px auto", 
      display: "block" 
    }}>
      
      {/* Top Row: Logo - Simplified centering */}
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        marginBottom: "15px",
        padding: "0 10px" 
      }}>
        <div style={{ textAlign: "center" }}>
          <img 
            src={favicon} 
            alt="Logo" 
            style={{ width: "56px", height: "50px", verticalAlign: "middle", borderRadius: 8, marginRight: "10px" }} 
          />
          <span style={{ fontSize: "26px", fontWeight: "bold", letterSpacing: "-0.5px" }}>VisuaMiTRa</span>
        </div>
      </div>

      {/* Filter Toolbar Row */}
      <div style={filterToolbarStyle}>
        <span style={{ fontWeight: 600 }}>Genomic Region:</span>
        <input placeholder="chr" value={chr} onChange={(e) => setChr(e.target.value)} style={inputStyle(80)} />
        <input type="number" placeholder="start" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle(100)} />
        <input type="number" placeholder="end" value={endPos} onChange={(e) => setEndPos(e.target.value)} style={inputStyle(100)} />
        <button onClick={onApply} disabled={loading} style={applyButtonStyle}>
          {loading ? "Applying..." : "Apply"}
        </button>
      </div>
      
      {error && <div style={{ color: "#b00020", fontSize: "13px", textAlign: "center", marginTop: "8px" }}>{error}</div>}
    </div>
  );
}

const filterToolbarStyle = {
  display: "flex", 
  justifyContent: "center", 
  alignItems: "center", 
  gap: "12px", 
  padding: "10px 16px", 
  border: "1px solid #ddd", 
  borderRadius: "8px", 
  background: "#f8f9fb", 
  boxShadow: "0px 4px 8px rgba(0,0,0,0.05)", 
  margin: "0 auto", // Centers the toolbar itself
  width: "fit-content"
};

const inputStyle = (w) => ({
  width: w, padding: "4px 8px", borderRadius: "4px", border: "1px solid #ccc"
});

const applyButtonStyle = {
  padding: "6px 16px", borderRadius: "6px", border: "none", background: "#328547", 
  color: "#fff", fontWeight: "600", cursor: "pointer"
};