import React from "react";

export default function ZoomControls({ zoomFactor, setZoomFactor }) {
  const ZOOM_STEP = 0.1;

  const expandRange = () => {
    setZoomFactor((z) => Math.min(z + ZOOM_STEP, 10)); // cap at ×10
  };

  const shrinkRange = () => {
    setZoomFactor((z) => Math.max(0.2, z - ZOOM_STEP)); // min ×0.2
  };

  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <button onClick={shrinkRange} style={btnStyle}>–</button>
      <span style={{ margin: "0 12px", fontSize: "15px" }}>
        Scale: {Math.round(zoomFactor * 100)}%
      </span>
      <button onClick={expandRange} style={btnStyle}>+</button>
    </div>
  );
}

const btnStyle = {
  padding: "4px 12px",
  fontSize: "18px",
  cursor: "pointer",
  borderRadius: "4px",
  border: "1px solid #ccc",
  background: "#fff"
};