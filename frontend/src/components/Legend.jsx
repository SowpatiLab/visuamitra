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
      {/*  Motif legend */}
      {hasDecomposition && motifs.length > 0 && (
        <div
          style={{
            columnCount: "auto",
            columnWidth: "160px",
            columnGap: "16px",
            overflow: "hidden",
            flex: 1,
          }}
        >
        <div
          style={{
            fontWeight: "bold",
            marginBottom: "8px",
            breakInside: "avoid",
          }}
        >
          Motif
        </div>

        {motifs.map(([motif, color]) => (
          <div
            key={motif}
            style={{
              marginBottom: "6px",
              display: "flex",
              alignItems: "center",
              breakInside: "avoid",
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
            marginTop: "12px",
            display: "flex",
            alignItems: "center",
            breakInside: "avoid",
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
      {/*  Methylation gradient */}
      <div
        style={{
          marginTop: "16px",
          paddingTop: "10px",
          borderTop: "1px dashed #aaa",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
          Methylation level {/* Add the 0.8 cutoff */}
        </div>

        <div style={{ position: "relative", height: "160px" }}>
          <div
            style={{
              width: "15px",
              height: "80%",
              background: `linear-gradient(to top, ${gradientArray.join(", ")})`,
              border: "1px solid #444",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 0,
              left: "30px",
              height: "80%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontSize: "13px",
            }}
          >
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          </div>

          {/* Ambiguous methylation */}
          {hasAmbiguousMeth && (
            <div
              style={{
                marginTop: "10px",
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
    </div>
  );
}
