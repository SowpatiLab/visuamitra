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

  const rootFontSizeRem = `${(baseFontSize / 16).toFixed(4)}rem`;

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
    .filter(Boolean) // Remove null/undefined entries from the array immediately
    .filter((r) => {
      // Ensure r has the Chrom property before trying to use it
      if (!r || !r.Chrom) return false; 
      if (!query) return true;
      
      const label = `${r.Chrom}:${r.Start}-${r.End}`.toLowerCase();
      return label.includes(query.toLowerCase());
    });

  const selectedRow = rows && selectedIdx != null ? rows[selectedIdx] : null;

  // Validate that this is a data row, not a header row/empty object
  const isValidData = 
    selectedRow && 
    typeof selectedRow === 'object' && 
    selectedRow.Chrom && 
    selectedRow.Chrom !== "Chrom";

  // Build the label only if data is valid; otherwise fallback to placeholder string
  const selectedLabel = isValidData
    ? `${selectedRow.Chrom}:${selectedRow.Start}-${selectedRow.End}`
    : "Select Locus...";

  return (
    <div 
      ref={ref} 
      style={{ 
        position: "relative", 
        width: "17.5em", // 280px converted to em
        fontSize: rootFontSizeRem 
      }}
    >
      {/* input */}
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
            fontSize: "inherit",
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
            maxHeight: "15em", // 240px converted to em
            overflowY: "auto",
            border: "0.0625em solid #aaa",
            borderRadius: "0 0 0.25em 0.25em",
            background: "#fff",
            zIndex: 1000,
            fontSize: "inherit", 
            boxShadow: "0 0.25em 0.5em rgba(0,0,0,0.12)"
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: "0.5em", color: "#999" }}>
              Not found
            </div>
          )}

          {filtered.map((r, fIdx) => {
            if (r.Chrom === "Chrom" || r.Start === "Start") return null;
            // Defensive findIndex
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