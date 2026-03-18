import React from "react";
import GenomicLocationPicker from "../../components/GenomicLocationPicker";

export default function NavigationControls({ onPrev, onNext, rows, selectedIdx, onSelect, onOpenSettings }) {
  return (
    <div style={navWrapperStyle}>
      {/* Grouping the navigation elements */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexGrow: 1, justifyContent: "center" }}>
        <button onClick={onPrev} style={btnStyle}>⟵ Previous</button>
        <GenomicLocationPicker 
          rows={rows} 
          selectedIdx={selectedIdx} 
          onSelect={onSelect} 
          style={{ fontSize: "13px", width: "380px", height: "32px" }} 
        />
        <button onClick={onNext} style={btnStyle}>Next ⟶</button>
      </div>

      {/* Settings button aligned on the same row */}
      <button
        onClick={onOpenSettings}
        style={settingsBtnStyle}
      >
        ⚙ View
      </button>
    </div>
  );
}

const navWrapperStyle = {
  display: "flex", 
  alignItems: "center", 
  justifyContent: "space-between", 
  width: "100%", 
  maxWidth: "1240px", 
  margin: "10px 0",
  padding: "0 10px"
};

const btnStyle = { padding: "4px 12px", fontSize: "14px", cursor: "pointer", borderRadius: "4px", border: "1px solid #ccc", background: "#fff" };

const settingsBtnStyle = {
  padding: "6px 12px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  border: "1px solid #328547",
  borderRadius: "6px",
  background: "#328547",
  color: "#eaf3ecff",
  marginLeft: "20px",
  transition: "all 0.2s"
};