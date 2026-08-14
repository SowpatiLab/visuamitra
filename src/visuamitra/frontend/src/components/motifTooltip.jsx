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
            padding: "0.5em 0.75em",        // 8px 12px
            borderRadius: "0.375em",        // 6px
            fontSize: "0.75rem",            // 12px
            maxWidth: "15.625rem",          // 250px
            whiteSpace: "normal",           // Allows text to wrap
            wordBreak: "break-all",         // Forces long DNA strings to break
            lineHeight: "1.5",              // Readability across multiple lines
            pointerEvents: "none",
            zIndex: 9999,
            boxShadow: "0 0.25em 0.75em rgba(0, 0, 0, 0.3)" // 0 4px 12px
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}