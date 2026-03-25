import React, { useState } from "react";

export default function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    setPos({
      x: e.clientX + 12,
      y: e.clientY + 12
    });
  };

  return (
    <span
      style={{ position: "relative" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onMouseMove={handleMouseMove}
    >
      {children}

      {visible && (
        <div
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            background: "#1f2937",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            
            // --- UPDATED FOR WRAPPING ---
            maxWidth: "250px",       // Limits the width of the tooltip
            whiteSpace: "normal",    // Allows text to wrap to new lines
            wordBreak: "break-all",  // Forces long DNA strings to break
            lineHeight: "1.5",       // Better readability for multiple lines
            
            pointerEvents: "none",
            zIndex: 9999,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}