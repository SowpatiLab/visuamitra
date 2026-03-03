import { getMethylationColorFactory } from "../utils/colorUtils";
import { useMemo } from "react";

export default function Legend({ colorMap, svgHeight = 440, hasDecomposition, hasAmbiguousMeth, methPalette, }) {
  const motifs = Object.entries(colorMap || {});
  const getMethylationColor = useMemo(() => {
    return getMethylationColorFactory(methPalette);
  }, [methPalette]);
  const gradientSteps = 20;
  const gradientArray = Array.from({ length: gradientSteps }, (_, i) =>
    getMethylationColor((i / (gradientSteps - 1)) * 100)
  );
  
  return (
    <div
      style={{
        marginTop: "20px",
        padding: "12px",
        border: "1px solid #444",
        borderRadius: "6px",
        background: "#fff",
        fontSize: "14px",
        maxHeight: svgHeight,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Motif legend */}
      {hasDecomposition && motifs.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "8px 16px",
            paddingBottom: "12px",
            borderBottom: "1px dashed #aaa",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              gridColumn: "1 / -1",
            }}
          >
            Motif
          </div>

          {motifs.map(([motif, color], index) => (
            <div
              key={motif}
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  background: color,
                  border: "1px solid #444",
                  marginRight: "8px",
                }}
              />
              {motif}
            </div>
          ))}

          {/* Non-repeating seq */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                background: "#bdbdbd",
                border: "1px solid #444",
                marginRight: "8px",
              }}
            />
            Non-repetitive seq
          </div>
        </div>
      )}

      {/* Methylation gradient (horizontal) */}
      <div style={{ paddingTop: "12px" }}>
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
          Methylation level
        </div>
        <div
          style={{
            height: "15px",
            width: "90%",
            background: `linear-gradient(to right, ${gradientArray.join(
              ", "
            )})`,
            border: "1px solid #444",
            marginBottom: "4px",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
        {hasAmbiguousMeth && (
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              fontSize: "13px",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "18px",
                border: "1px solid #888",
                background: "rgba(200,200,200,0.25)",
                marginRight: "8px",
              }}
            />
            Ambiguous methylation
          </div>
        )}
      </div>
      </div>
    
  );
}
