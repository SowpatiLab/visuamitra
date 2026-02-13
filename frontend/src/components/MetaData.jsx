import React from "react";

export default function MetadataDisplay({ row }) {
  if (!row) return null;

  const motif = row.Motif ?? "NA";
  const motifSize = row.Motif_size ?? "NA"
  const gt = row.GT ?? "NA";
  const motifDisplay =
  typeof motif === "string" && motifSize > 20
    ? `${motif.slice(0, 20)}…`
    : motif;

const showMotifTooltip =
  typeof motif === "string" && motifSize > 20 ? motif : undefined;


  const formatAlleles = (value) => {
    if (!value) return "NA";

    let arr = value;

    // If value is a string that looks like an array, parse it
    if (typeof value === "string" && value.startsWith("[")) {
      try {
        arr = JSON.parse(value);
      } catch (e) {
        return value; // fallback if parsing fails
      }
    }

    if (Array.isArray(arr)) {
      const a1 = arr[0] ?? "NA";
      const a2 = arr[1] ?? "NA";
      return `A1: ${a1}, A2: ${a2}`;
    }

    return arr ?? "NA";
  };

  const readSupport = formatAlleles(row.Read_support);
  const meanMeth = formatAlleles(row.Mean_meth);

  return (
    <div
      style={{
        display: "flex",
        gap: "24px",
        fontSize: "14px",
        alignItems: "baseline",
        marginTop: "16px",
        marginBottom: "8px",
      }}
    >
      <div>
        <strong>Expected Motif:</strong>{" "}
        <span
          title={showMotifTooltip}
          style={{
            cursor: motifSize > 20 ? "help" : "default",
            borderBottom: motifSize > 20 ? "1px dotted #888" : "none",
          }}
        >
          {motifDisplay}
        </span>
      </div>
      <div>
        <strong>Motif size:</strong> {motifSize}
      </div>
      <div>
        <strong>Genotype:</strong> {gt}
      </div>
      <div>
        <strong>Read support:</strong> {readSupport}
      </div>
      <div>
        <strong>Mean methylation:</strong> {meanMeth}
      </div>
    </div>
  );
}
