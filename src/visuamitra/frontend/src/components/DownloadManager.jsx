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
  start 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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

    setIsExporting(true);

    try {
      const scale = 2;
      const padding = 40;
      
      // Get Rects
      const titleRect = titleRef.current?.getBoundingClientRect() || { width: 0, height: 0 };
      const svgRect = svgElement.getBoundingClientRect();
      const legendRect = options.includeLegend ? legendRef.current?.getBoundingClientRect() : { width: 0, height: 0 };
      
      // Logic for metadata: We only want the TABLE part if title is already included
      const metadataElement = metadataRef.current?.querySelector('table')?.parentElement || metadataRef.current;
      const metaRect = options.includeMetadata ? metadataElement?.getBoundingClientRect() : { width: 0, height: 0 };

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Calculate total width
      let totalWidth = svgRect.width + padding * 2;
      if (options.includeLegend) totalWidth += legendRect.width + padding;
      
      let totalHeight = titleRect.height + Math.max(svgRect.height, legendRect.height) + (padding * 2);
      if (options.includeMetadata) totalHeight += metaRect.height + padding;
      totalHeight += padding; 

      canvas.width = totalWidth * scale;
      canvas.height = totalHeight * scale;
      
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      let currentY = padding;      

      // Draw Metadata Table (Optional)
      if (options.includeMetadata && metadataElement) {
        const metaCanvas = await html2canvas(metadataElement, { scale: scale, backgroundColor: "#ffffff" });
        ctx.drawImage(metaCanvas, padding, currentY, metaRect.width, metaRect.height);
        currentY += metaRect.height + padding;
      }

      // DRAW TITLE (Pills)
      if (titleRef.current) {
        const titleCanvas = await html2canvas(titleRef.current, { scale: scale, backgroundColor: "#ffffff" });
        ctx.drawImage(titleCanvas, padding, currentY, titleRect.width, titleRect.height);
        currentY += titleRect.height + padding;
      }

      // Draw SVG Plot
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.src = url;

      await new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, padding, currentY, svgRect.width, svgRect.height);
          URL.revokeObjectURL(url);
          resolve();
        };
      });

      // Draw Legend (Optional)
      if (options.includeLegend && legendRef.current) {
        const legCanvas = await html2canvas(legendRef.current, { scale: scale, backgroundColor: "#ffffff" });
        // Align legend with the plot Y
        ctx.drawImage(legCanvas, svgRect.width + padding * 2, currentY, legendRect.width, legendRect.height);
      }

      const link = document.createElement("a");
      link.download = `visuamitra_${chrom}_${start}_${viewMode}.${options.format}`;
      link.href = canvas.toDataURL(`image/${options.format === 'jpeg' ? 'jpeg' : 'png'}`, 1.0);
      link.click();

      setIsOpen(false);
    } catch (err) {
      console.error("Export Error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} style={mainButtonStyle}>
        <Download size={16} />
        Download Export
        <ChevronDown size={14} style={{ marginLeft: "4px", transform: isOpen ? "rotate(180deg)" : "none" }} />
      </button>

      {isOpen && (
        <div style={cardStyle}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#333" }}>Export Settings</h4>
          
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