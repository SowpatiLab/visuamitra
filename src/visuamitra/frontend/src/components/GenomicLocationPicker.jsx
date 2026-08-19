import React, { useState, useRef, useEffect } from "react";

function highlightMatch(text, query) {
  if (!query) return text;

  const t = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = t.indexOf(q);

  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <strong>{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function GenomicLocationPicker({
  rows,
  selectedIdx,
  onSelect,
  baseFontSize = 13
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = (rows || [])
    .filter(Boolean)
    .filter((r) => {
      if (!r || !r.Chrom) return false; 
      if (!query) return true;
      
      const label = `${r.Chrom}:${r.Start}-${r.End}`.toLowerCase();
      return label.includes(query.toLowerCase());
    });

  const selectedRow = rows && selectedIdx != null ? rows[selectedIdx] : null;

  const isValidData = 
    selectedRow && 
    typeof selectedRow === 'object' && 
    selectedRow.Chrom && 
    selectedRow.Chrom !== "Chrom";

  const selectedLabel = isValidData
    ? `${selectedRow.Chrom}:${selectedRow.Start}-${selectedRow.End}`
    : "Select Locus...";

  return (
    <div 
      ref={ref} 
      style={{ 
        position: "relative", 
        width: "21.5em",
        fontSize: `${baseFontSize}px` 
      }}
    >
      {/* input wrapper */}
      <div
        style={{
          border: "0.0625em solid #aaa",
          borderRadius: "0.25em",
          padding: "0.375em 0.5em",
          display: "flex",
          alignItems: "center",
          background: "#fff",
          cursor: "text",
        }}
        onClick={() => setOpen(true)}
      >
        <input
          value={open ? query : selectedLabel}
          placeholder="Search location"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          style={{
            border: "none",
            outline: "none",
            flex: 1,
            fontSize: `${baseFontSize}px`,
            background: "transparent",
            color: "inherit"
          }}
        />
      </div>

      {/* dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            maxHeight: "15em",
            overflowY: "auto",
            border: "0.0625em solid #aaa",
            borderRadius: "0 0 0.25em 0.25em",
            background: "#fff",
            zIndex: 1000,
            fontSize: `${baseFontSize}px`, 
            boxShadow: "0 0.25em 0.5em rgba(0,0,0,0.12)"
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: "0.5em", color: "#999", fontSize: `${baseFontSize}px` }}>
              Not found
            </div>
          )}

          {filtered.map((r, fIdx) => {
            if (r.Chrom === "Chrom" || r.Start === "Start") return null;
            
            const originalIdx = (rows || []).findIndex(original => 
              original && 
              original.Chrom === r.Chrom && 
              original.Start === r.Start && 
              original.End === r.End
            );
            const label = `${r.Chrom}:${r.Start}-${r.End}`;

            return (
              <div
                key={`${r.Chrom}-${r.Start}-${fIdx}`}
                onClick={() => {
                  if (originalIdx !== -1) onSelect(originalIdx); 
                  setQuery("");
                  setOpen(false);
                }}
                style={{
                  padding: "0.3125em 0.5em", 
                  cursor: "pointer",
                  fontSize: `${baseFontSize}px`,
                  background: originalIdx === selectedIdx ? "#eef" : "transparent",
                }}
              >
                {highlightMatch(label, query)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}