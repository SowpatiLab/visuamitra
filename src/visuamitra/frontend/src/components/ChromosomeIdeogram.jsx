import React, { useEffect, useRef } from "react";
// @ts-ignore
import Ideogram from "ideogram";

export default function ChromosomeIdeogram({
  chr,
  start,
  end,
  height = 120,
  chrHeight = 80,
  chrWidth = 8
}) {
  const ideogramRef = useRef(null);
  const SMALL_TRI_HEIGHT = 7;

  useEffect(() => {
    if (!chr || !start || !end) return;

    const pureChr = chr.replace(/^chr/i, "");
    const container = document.getElementById("ideogram-container");
    if (container) container.innerHTML = "";

    const ideo = new Ideogram({
      organism: "human",
      container: "#ideogram-container",
      chromosomes: [pureChr],
      orientation: "horizontal",
      chrHeight,
      chrWidth,
      showBandLabels: true,
      showChromosomeLabels: true,
      // annotations instead of a brush/cursor
      annotations: [
        {
          name: "TR Locus",
          chr: pureChr,
          start: start,
          stop: end,
          color: "#fa4242", 
          shape: "triangle" 
        }
      ],
      annotationHeight: SMALL_TRI_HEIGHT,
    });

    ideogramRef.current = ideo;

    return () => {
      if (container) container.innerHTML = "";
    };
  }, [chr, start, end, chrHeight, chrWidth]);

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      width: "100%",
      pointerEvents: "none", 
      userSelect: "none" 
    }}>
      <div
        id="ideogram-container"
        style={{
          width: "1100px",
          height: `${height}px`,
          margin: "0 auto",
        }}
      />
    </div>
  );
}