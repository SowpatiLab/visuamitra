import React, { useEffect, useRef } from "react";
import Ideogram from "ideogram";
import "../App.css";

export default function ChromosomeIdeogram({
  chr,
  start,
  end,
  width = "100%",
  height = 120,       // container height
  chrHeight = 80,     // smaller chromosome graphic
  chrWidth = 8        // thinner chromosome bar
}) {
  // use a ref to avoid re-render conflicts
  const ideogramRef = useRef(null);

  useEffect(() => {
    if (!chr) return;

    // make brush if both start/end
    let brushString = null;
    if (start && end) {
      brushString = `${chr}:${start}-${end}`;
    }

    // cleanup old instance if any
    if (ideogramRef.current?.node) {
      ideogramRef.current.node().remove();
    }

    // create new ideogram
    const ideo = new Ideogram({
      organism: "human",
      container: "#ideogram-container",
      chromosomes: [chr.replace(/^chr/, "")],
      orientation: "horizontal",
      brush: brushString,
      chrHeight,
      chrWidth,
      showBandLabels: true,
      showChromosomeLabels: true // optional: hide labels for smaller size
    });

    // store
    ideogramRef.current = ideo;

    return () => {
      // remove on unmount
      if (ideogramRef.current?.node) {
        ideogramRef.current.node().remove();
      }
    };
  }, [chr, start, end, chrHeight, chrWidth]);

  return (
    <div
      style={{
        display: "flex",               // makes flex container
        justifyContent: "center",      // horizontally centers children
        width: "100%",                // full width available
        marginBottom: "0px",         // spacing below
      }}
    >
      <div
        id="ideogram-container"
        style={{
          width: "1100px",
          margin: "0 auto",                       // this can be % or px
          height: `${height}px`,       // container height
        }}
      />
    </div>
  );
}

