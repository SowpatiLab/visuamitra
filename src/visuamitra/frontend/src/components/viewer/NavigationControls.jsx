import React from "react";
import GenomicLocationPicker from "../GenomicLocationPicker";

export default function NavigationControls({
  onPrev,
  onNext,
  rows,
  selectedIdx,
  onSelect,
  onOpenSettings,
  baseFontSize = 13
}) {
  return (
    <div style={{ ...navWrapperStyle, fontSize: `${baseFontSize}px` }}>
      {/* Navigation center group */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75em", flexGrow: 1, justifyContent: "center" }}>
        <button onClick={onPrev} style={{ ...btnStyle, fontSize: `${baseFontSize}px` }}>
          ⟵ Previous
        </button>

        <GenomicLocationPicker 
          rows={rows} 
          selectedIdx={selectedIdx} 
          onSelect={onSelect} 
          baseFontSize={baseFontSize} 
        />

        <button onClick={onNext} style={{ ...btnStyle, fontSize: `${baseFontSize}px` }}>
          Next ⟶
        </button>
      </div>

      {/* View / Settings button aligned to the right */}
      <button
        onClick={onOpenSettings}
        style={{ ...settingsBtnStyle, fontSize: `${baseFontSize}px` }}
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
  cursor: "pointer", 
  borderRadius: "0.25em", 
  border: "0.0625em solid #ccc", 
  background: "#fff",
  fontWeight: "500"
};

const settingsBtnStyle = {
  padding: "0.375em 0.75em",
  fontWeight: "600",
  cursor: "pointer",
  border: "0.0625em solid #328547",
  borderRadius: "0.375em",
  background: "#328547",
  color: "#eaf3ec",
  marginLeft: "1.25em",
  transition: "all 0.2s"
};