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
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  /*  close on outside click  */
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = (rows || []).filter((r) => {
    if (!query) return true;
    const label = `${r.Chrom}:${r.Start}-${r.End}`.toLowerCase();
    return label.includes(query.toLowerCase());
  });

  const selectedRow = rows && selectedIdx != null ? rows[selectedIdx] : null;
  const selectedLabel = selectedRow?.Chrom 
    ? `${selectedRow.Chrom}:${selectedRow.Start}-${selectedRow.End}` 
    : "Select Locus...";

  return (
    <div ref={ref} style={{ position: "relative", width: "280px" }}>
      {/* input */}
      <div
        style={{
          border: "1px solid #aaa",
          borderRadius: "4px",
          padding: "6px 8px",
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
            fontSize: "14px",
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
            maxHeight: "240px",
            overflowY: "auto",
            border: "1px solid #aaa",
            background: "#fff",
            zIndex: 1000,
            fontSize: "13px", 
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: "8px", color: "#999" }}>
              Not found
            </div>
          )}

          {filtered.map((r) => {
            const idx = rows.indexOf(r);
            const label = `${r.Chrom}:${r.Start}-${r.End}`;

            return (
              <div
                key={idx}
                onClick={() => {
                  onSelect(idx);
                  setQuery("");
                  setOpen(false);
                }}
                style={{
                  padding: "5px 8px", 
                  cursor: "pointer",
                  background:
                    idx === selectedIdx ? "#eef" : "transparent",
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
