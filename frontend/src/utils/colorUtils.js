// utils/colorUtils.js
import * as d3 from "d3-scale";
import * as d3Chromatic from "d3-scale-chromatic";

/**
 * Generate unique colors for motifs (categorical)
 * Uses ColorBrewer palettes (Set1, Set2, Set3, etc.)
 * @param {string[]} motifs 
 * @param {string} paletteName - any ColorBrewer categorical palette
 * @returns {object} motif -> color
 */
export function generateMotifColors(motifs, paletteName = "Set3") {
  const scheme = d3Chromatic[`scheme${paletteName}`];

  if (!scheme) {
    console.warn(`Unknown ColorBrewer palette: ${paletteName}`);
    return {};
  }

  // ✔ Handle BOTH flat arrays and nested arrays
  const colors = Array.isArray(scheme[0])
    ? scheme[Math.min(motifs.length, scheme.length - 1)]
    : scheme;

  const colorMap = {};
  motifs.forEach((motif, i) => {
    colorMap[motif] = colors[i % colors.length];
  });

  return colorMap;
}

/**
 * Generate a gradient color function for methylation
 * Supports multiple D3 sequential color scales (Viridis, Plasma, Inferno, etc.)
 * @param {string} scaleName - "Viridis", "Plasma", "Inferno", "Magma", "Cividis"
 * @returns {function(number): string} - function taking 0-100 and returning hex
 */
export function getMethylationColorFactory(scaleName = "viridis") {
  const scaleMap = {
    viridis: d3Chromatic.interpolateViridis,
    plasma: d3Chromatic.interpolatePlasma,
    inferno: d3Chromatic.interpolateInferno,
    magma: d3Chromatic.interpolateMagma,
    cividis: d3Chromatic.interpolateCividis,
    turbo: d3Chromatic.interpolateTurbo,
  };

  const key = scaleName?.toLowerCase();
  const interpolator = scaleMap[key] || d3Chromatic.interpolateViridis;

  /**
   * Convert 0-100 methylation value to color
   * @param {number} methValue 0-100
   * @returns {string} hex color
   */
  return function getColor(methValue) {
    if (methValue == null || isNaN(methValue)) return interpolator(0);

    const v = Math.max(0, Math.min(100, methValue)) / 100;

    return interpolator(1-v);
  };
}
