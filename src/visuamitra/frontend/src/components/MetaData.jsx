import React from "react";
import Tooltip from "./motifTooltip";

export default function MetadataDisplay({ row }) {
  if (!row) return null;

  const locusID = row.ID ?? "NA";
  const motif = row.Motif ?? "NA";
  const motifSize = Number(row.Motif_size) || 0;
  const gt = row.GT ?? "NA";

  const isLong = motif.length > 15;

  const motifDisplay = isLong
    ? `${motif.slice(0, 15)}…`
    : motif;

  const showMotifTooltip = isLong
    ? `${motif} (length ${motif.length})`
    : "";

  const formatAlleles = (value) => {
    if (!value) return "NA";

    let arr = value;

    if (typeof value === "string" && value.startsWith("[")) {
      try {
        arr = JSON.parse(value);
      } catch {
        return value;
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
        width: "1320px",
        margin: "0 auto",
        display: "flex",
        flexWrap: "wrap",
        gap: "24px",
        fontSize: "14px",
        alignItems: "baseline",
        marginTop: "16px",
        marginBottom: "8px",
      }}
    >

      <div>
        <strong>Locus ID: </strong>{locusID}        
      </div>
      <div>
        <strong>Expected Motif:</strong>{" "}

        {isLong ? (
          <Tooltip text={showMotifTooltip}>
            <span
              style={{
                borderBottom: "1px dotted #888",
                cursor: "zoom-in",
                fontFamily: "monospace"
              }}
            >
              {motifDisplay}
            </span>
          </Tooltip>
        ) : (
          motifDisplay
        )}
      </div>

      <div>
        <strong>Motif size:</strong> {motifSize || "NA"}
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