import React, { useEffect, useRef, useState, Component } from "react";
// @ts-ignore
import Ideogram from "ideogram";

// Standard GRCh38 chromosome max base-pair lengths to pre-validate coordinates
const HG38_CHR_LENGTHS = {
  "1": 248956422, "2": 242193529, "3": 198295559, "4": 190214555,
  "5": 181538259, "6": 170805979, "7": 159345973, "8": 145138636,
  "9": 138394717, "10": 133797422, "11": 135086622, "12": 133275309,
  "13": 114364328, "14": 107043718, "15": 101991189, "16": 90338345,
  "17": 83257441, "18": 80373285, "19": 58617616, "20": 64444167,
  "21": 46709983, "22": 50818468, "X": 156040895, "Y": 57227415
};

class IdeogramErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("Ideogram rendering suppressed safely:", error);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <IdeogramFallback height={this.props.height} />;
    }
    return this.props.children;
  }
}

function IdeogramFallback({ height = 80 }) {
  return (
  <div style={{ 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center",
    width: "100%",
    minHeight: `${height}px`
  }}>
    <div style={{
      padding: "10px 20px",
      background: "#f9fafb",
      border: "1px dashed #d1d5db",
      borderRadius: "6px",
      color: "#6b7280",
      fontSize: "13px",
      fontWeight: "500",
      textAlign: "center",
      letterSpacing: "0.2px",
      lineHeight: "1.5"
    }}>
      T2T-CHM13 view coming soon
      <br />
      <span style={{ fontSize: "12px", color: "#9ca3af" }}>
        (Currently available for hg38 builds & approximate T2T based on Hg38 bounds)
      </span>
    </div>
  </div>
);
}

function IdeogramInner({ chr, start, end, refGenome, height, chrHeight, chrWidth }) {
  const containerRef = useRef(null);
  const ideogramRef = useRef(null);
  const SMALL_TRI_HEIGHT = 7;

  const pureChr = (chr || "").replace(/^chr/i, "").toUpperCase();

  // Check 1: Explicit assembly prop check
  const isT2T = React.useMemo(() => {
    if (!refGenome) return false;
    const lower = refGenome.toLowerCase();
    return lower.includes("t2t") || lower.includes("chm13");
  }, [refGenome]);

  // Check 2: Coordinate out-of-bounds validation against hg38 max lengths
  const isOutOfBounds = React.useMemo(() => {
    const maxLen = HG38_CHR_LENGTHS[pureChr];
    if (maxLen && Number(end) > maxLen) {
      return true;
    }
    return false;
  }, [pureChr, end]);

  useEffect(() => {
    if (!chr || !start || !end || isT2T || isOutOfBounds) return;

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    try {
      const ideo = new Ideogram({
        organism: "human",
        container: "#visuamitra-ideogram-container",
        assembly: "GRCh38",
        dataDir: "https://unpkg.com/ideogram@1.41.0/dist/data/bands/native/",
        chromosomes: [pureChr],
        orientation: "horizontal",
        chrHeight: chrHeight || 400,
        chrWidth: chrWidth || 10,
        showBandLabels: true,
        showChromosomeLabels: true,
        annotations: [
          {
            name: "TR Locus",
            chr: pureChr,
            start: Number(start),
            stop: Number(end),
            color: "#fa4242",
            shape: "triangle"
          }
        ],
        annotationHeight: SMALL_TRI_HEIGHT,
      });

      ideogramRef.current = ideo;
    } catch (e) {
      console.warn("Failed to instantiate Ideogram:", e);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [chr, start, end, pureChr, isT2T, isOutOfBounds, chrHeight, chrWidth]);

  if (isT2T || isOutOfBounds) {
    return <IdeogramFallback height={height} />;
  }

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      width: "100%",
      pointerEvents: "none", 
      userSelect: "none" 
    }}>
      <div
        id="visuamitra-ideogram-container"
        ref={containerRef}
        style={{
          width: "1100px",
          height: `${height}px`,
          margin: "0 auto",
        }}
      />
    </div>
  );
}

export default function ChromosomeIdeogram(props) {
  const resetKey = `${props.chr}-${props.start}-${props.end}-${props.refGenome}`;
  
  return (
    <IdeogramErrorBoundary resetKey={resetKey} height={props.height}>
      <IdeogramInner {...props} />
    </IdeogramErrorBoundary>
  );
}