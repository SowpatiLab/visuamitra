import React, { useState, useRef, useEffect } from "react";
import { Download, ChevronDown, Check } from "lucide-react";
import html2canvas from "html2canvas";

export default function DownloadManager({ 
  visualizerRef, 
  legendRef, 
  metadataRef, 
  titleRef,  
  viewMode, 
  chrom, 
  start,
  isExporting,      
  setIsExporting     
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({
    includeLegend: true,
    includeMetadata: false,
    format: "png" 
  });

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStartDownload = async () => {
    const svgElement = visualizerRef.current?.querySelector("svg");
    if (!svgElement) {
      alert("Plot not found.");
      return;
    }

    // Signal parent layout to natively reveal all table rows 
    setIsExporting(true);

    // Small delay to let React fully update DOM elements with all rows
    await new Promise((resolve) => setTimeout(resolve, 120));

    // Store original styling parameters to cleanly restore after layout calculation
    let originalWidth = "";
    let originalOverflow = "";

    try {
      const metadataElement = metadataRef.current;
      const padding = 24;
      
      // Force expand legend container before calculating master boundaries
      if (options.includeLegend && legendRef.current) {
        originalWidth = legendRef.current.style.width;
        originalOverflow = legendRef.current.style.overflow;
        legendRef.current.style.width = "auto";
        legendRef.current.style.overflow = "visible";
      }

      // Extract raw baseline pixel attributes from the SVG structure to completely ignore screen scaling factors
      const rawSvgWidth = parseFloat(svgElement.getAttribute("width")) || svgElement.viewBox.baseVal.width || 800;
      const rawSvgHeight = parseFloat(svgElement.getAttribute("height")) || svgElement.viewBox.baseVal.height || 600;

      // Read surrounding HTML block measurements accurately (Legend now measures at its TRUE full width)
      const metaRect = options.includeMetadata && metadataElement ? metadataElement.getBoundingClientRect() : { width: 0, height: 0 };
      const titleRect = titleRef.current?.getBoundingClientRect() || { width: 0, height: 0 };
      const legendRect = options.includeLegend ? legendRef.current?.getBoundingClientRect() : { width: 0, height: 0 };

      // Clone SVG and map runtime font family values
      const svgClone = svgElement.cloneNode(true);
      const currentFont = window.getComputedStyle(visualizerRef.current).fontFamily;
      
      svgClone.style.fontFamily = currentFont;
      svgClone.style.width = `${rawSvgWidth}px`;
      svgClone.style.height = `${rawSvgHeight}px`;
      svgClone.style.transform = "none"; 

      svgClone.querySelectorAll("text").forEach(text => {
          text.setAttribute("font-family", currentFont);
          const computedStyle = window.getComputedStyle(text);
          text.setAttribute("fill", computedStyle.fill);
      });

      // Calculate master horizontal size using updated full width + extra buffer space
      let totalWidth = rawSvgWidth + padding * 2;
      if (options.includeLegend) totalWidth += legendRect.width + padding + 16; 
      
      let totalHeight = titleRect.height + Math.max(rawSvgHeight, legendRect.height) + (padding * 2);
      if (options.includeMetadata) totalHeight += metaRect.height + padding;
      totalHeight += padding; 

      // SVG FORMAT PATH 
      if (options.format === "svg") {
          const masterSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          masterSvg.setAttribute("width", totalWidth);
          masterSvg.setAttribute("height", totalHeight);
          masterSvg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
          masterSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          masterSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
          masterSvg.style.backgroundColor = "#ffffff";
          masterSvg.style.fontFamily = currentFont;

          let currentY = padding;

          if (options.includeMetadata && metadataElement) {
              const metaCanvas = await html2canvas(metadataElement, { scale: 2, backgroundColor: "#ffffff" });
              const metaDataUrl = metaCanvas.toDataURL("image/png");

              const svgMetaImage = document.createElementNS("http://www.w3.org/2000/svg", "image");
              svgMetaImage.setAttributeNS("http://www.w3.org/1999/xlink", "href", metaDataUrl);
              svgMetaImage.setAttribute("x", padding);
              svgMetaImage.setAttribute("y", currentY);
              svgMetaImage.setAttribute("width", metaRect.width);
              svgMetaImage.setAttribute("height", metaRect.height);

              masterSvg.appendChild(svgMetaImage);
              currentY += metaRect.height + padding;
          }

          if (titleRef.current) {
              const titleCanvas = await html2canvas(titleRef.current, { scale: 2, backgroundColor: "#ffffff" });
              const titleDataUrl = titleCanvas.toDataURL("image/png");

              const svgTitleImage = document.createElementNS("http://www.w3.org/2000/svg", "image");
              svgTitleImage.setAttributeNS("http://www.w3.org/1999/xlink", "href", titleDataUrl);
              svgTitleImage.setAttribute("x", padding);
              svgTitleImage.setAttribute("y", currentY);
              svgTitleImage.setAttribute("width", titleRect.width);
              svgTitleImage.setAttribute("height", titleRect.height);

              masterSvg.appendChild(svgTitleImage);
              currentY += titleRect.height + padding;
          }

          svgClone.setAttribute("x", padding);
          svgClone.setAttribute("y", currentY);
          masterSvg.appendChild(svgClone);

          if (options.includeLegend && legendRef.current) {
              const legCanvas = await html2canvas(legendRef.current, { 
                scale: 2, 
                backgroundColor: "#ffffff",
                width: legendRect.width 
              });
              const legDataUrl = legCanvas.toDataURL("image/png");

              const svgLegendImage = document.createElementNS("http://www.w3.org/2000/svg", "image");
              svgLegendImage.setAttributeNS("http://www.w3.org/1999/xlink", "href", legDataUrl);
              svgLegendImage.setAttribute("x", rawSvgWidth + padding * 2);
              svgLegendImage.setAttribute("y", currentY);
              svgLegendImage.setAttribute("width", legendRect.width); 
              svgLegendImage.setAttribute("height", legendRect.height);

              masterSvg.appendChild(svgLegendImage);
          }

          const serializer = new XMLSerializer();
          let source = serializer.serializeToString(masterSvg);
          if (!source.startsWith('<?xml')) {
              source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
          }

          const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
          const link = document.createElement("a");
          link.href = url;
          link.download = `visuamitra_${chrom}_${start}_${viewMode}.svg`;
          link.click();
          
          setIsOpen(false);
          return; 
      }
      // PNG/JPEG FORMAT PATH 
      const scale = 2;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = totalWidth * scale;
      canvas.height = totalHeight * scale;
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      let currentY = padding;      

      if (options.includeMetadata && metadataElement) {
        const metaCanvas = await html2canvas(metadataElement, { scale: scale, backgroundColor: "#ffffff" });
        ctx.drawImage(metaCanvas, padding, currentY, metaRect.width, metaRect.height);
        currentY += metaRect.height + padding;
      }

      if (titleRef.current) {
        const titleCanvas = await html2canvas(titleRef.current, { scale: scale, backgroundColor: "#ffffff" });
        ctx.drawImage(titleCanvas, padding, currentY, titleRect.width, titleRect.height);
        currentY += titleRect.height + padding;
      }

      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.src = url;

      await new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, padding, currentY, rawSvgWidth, rawSvgHeight);
          URL.revokeObjectURL(url);
          resolve();
        };
      });

      if (options.includeLegend && legendRef.current) {
        const legCanvas = await html2canvas(legendRef.current, { 
          scale: scale, 
          backgroundColor: "#ffffff",
          width: legendRect.width 
        });

        ctx.drawImage(legCanvas, rawSvgWidth + padding * 2, currentY, legendRect.width, legendRect.height);
      }

      const link = document.createElement("a");
      link.download = `visuamitra_${chrom}_${start}_${viewMode}.${options.format}`;
      link.href = canvas.toDataURL(`image/${options.format === 'jpeg' ? 'jpeg' : 'png'}`, 1.0);
      link.click();

      setIsOpen(false);
    } catch (err) {
      console.error("Export Error:", err);
    } finally {
      // Reset styles back to normal screen interface doesn't shift permanently
      if (options.includeLegend && legendRef.current) {
        legendRef.current.style.width = originalWidth;
        legendRef.current.style.overflow = originalOverflow;
      }
      setIsExporting(false);
    }
  };

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} style={mainButtonStyle}>
        <Download size={16} />
        Download
        <ChevronDown size={14} style={{ marginLeft: "4px", transform: isOpen ? "rotate(180deg)" : "none" }} />
      </button>

      {isOpen && (
        <div style={cardStyle}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#333" }}>Download Options</h4>
          
          <div style={sectionLabelStyle}>INCLUDE CONTENT</div>
          <div style={optionGroupStyle}>
            <button 
              style={options.includeLegend ? activeSubStyle : inactiveSubStyle}
              onClick={() => setOptions({...options, includeLegend: !options.includeLegend})}
            >
              {options.includeLegend && <Check size={12} />} Legend
            </button>
            <button 
              style={options.includeMetadata ? activeSubStyle : inactiveSubStyle}
              onClick={() => setOptions({...options, includeMetadata: !options.includeMetadata})}
            >
              {options.includeMetadata && <Check size={12} />} Metadata
            </button>
          </div>

          <div style={sectionLabelStyle}>FILE FORMAT</div>
          <div style={optionGroupStyle}>
            <button 
                style={options.format === "svg" ? activeSubStyle : inactiveSubStyle}
                onClick={() => setOptions({...options, format: "svg"})}
            >
                SVG
            </button>
            <button 
              style={options.format === "png" ? activeSubStyle : inactiveSubStyle}
              onClick={() => setOptions({...options, format: "png"})}
            >
              PNG
            </button>
            <button 
              style={options.format === "jpeg" ? activeSubStyle : inactiveSubStyle}
              onClick={() => setOptions({...options, format: "jpeg"})}
            >
              JPEG
            </button>
          </div>

          <hr style={{ border: "0", borderTop: "1px solid #eee", margin: "12px 0" }} />

          <button 
            onClick={handleStartDownload}
            disabled={isExporting}
            style={confirmButtonStyle}
          >
            {isExporting ? "Processing..." : `Download ${options.format.toUpperCase()}`}
          </button>
        </div>
      )}
    </div>
  );
}

const mainButtonStyle = { display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "#328547", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" };
const cardStyle = { position: "absolute", bottom: "110%", right: 0, width: "260px", background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", border: "1px solid #ddd", zIndex: 1000, textAlign: "left" };
const sectionLabelStyle = { fontSize: "10px", fontWeight: "bold", color: "#888", letterSpacing: "0.5px", marginBottom: "6px", marginTop: "10px" };
const optionGroupStyle = { display: "flex", gap: "8px", marginBottom: "8px" };
const activeSubStyle = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "6px", fontSize: "12px", background: "#e8f5e9", color: "#2e7d32", border: "1px solid #2e7d32", borderRadius: "6px", cursor: "pointer", fontWeight: "600" };
const inactiveSubStyle = { flex: 1, padding: "6px", fontSize: "12px", background: "#f5f5f5", color: "#666", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" };
const confirmButtonStyle = { width: "100%", padding: "10px", background: "#333", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" };