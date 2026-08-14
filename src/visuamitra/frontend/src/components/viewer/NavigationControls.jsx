import React from "react";
import GenomicLocationPicker from "../GenomicLocationPicker";

export default function NavigationControls({ onPrev, onNext, rows, selectedIdx, onSelect, onOpenSettings, baseFontSize = 13 }) {
  return (
    <div style={navWrapperStyle}>
      {/* Grouping the navigation elements */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75em", flexGrow: 1, justifyContent: "center" }}>
        <button onClick={onPrev} style={btnStyle}>⟵ Previous</button>
        <GenomicLocationPicker 
          rows={rows} 
          selectedIdx={selectedIdx} 
          onSelect={onSelect} 
          style={{ fontSize: "0.8125em", width: "23.75em", height: "2em" }} 
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
  maxWidth: "77.5em", 
  margin: "0.625em 0",
  padding: "0 0.625em"
};

const btnStyle = { 
  padding: "0.25em 0.75em", 
  fontSize: "inherit", 
  cursor: "pointer", 
  borderRadius: "0.25em", 
  border: "0.0625em solid #ccc", 
  background: "#fff" 
};

const settingsBtnStyle = {
  padding: "0.375em 0.75em",
  fontSize: "inherit",
  fontWeight: "600",
  cursor: "pointer",
  border: "0.0625em solid #328547",
  borderRadius: "0.375em",
  background: "#328547",
  color: "#eaf3ecff",
  marginLeft: "1.25em",
  transition: "all 0.2s"
};