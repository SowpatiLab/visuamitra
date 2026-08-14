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
    <div style={{ textAlign: "center", padding: "1em 0" }}>
      <button onClick={shrinkRange} style={btnStyle}>–</button>
      <span style={{ margin: "0 0.75em", fontSize: "0.9375em" }}>
        Scale: {Math.round(zoomFactor * 100)}%
      </span>
      <button onClick={expandRange} style={btnStyle}>+</button>
    </div>
  );
}

const btnStyle = {
  padding: "0.25em 0.75em",
  fontSize: "1.125em",
  cursor: "pointer",
  borderRadius: "0.25em",
  border: "0.0625em solid #ccc",
  background: "#fff"
};