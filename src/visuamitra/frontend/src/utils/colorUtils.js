import * as d3Chromatic from "d3-scale-chromatic";
import { rgb, hsl } from "d3-color";

export function generateMotifColors(motifs, paletteName = "Set3") {
  const scheme = d3Chromatic[`scheme${paletteName}`];

  // fallback if palette not found
  const rawColors = scheme
    ? Array.isArray(scheme[0])
      ? scheme[scheme.length - 1] // take the largest array
      : scheme
    : [];

  // filter out greyish
  const baseColors = rawColors.filter((hex) => {
    const c = rgb(hex);
    const diff = Math.max(
      Math.abs(c.r - c.g),
      Math.abs(c.g - c.b),
      Math.abs(c.r - c.b),
    );
    return diff > 20;
  });

  const used = [];
  const colorMap = {};

  // first assign baseColors
  motifs.forEach((motif, i) => {
    if (i < baseColors.length) {
      const col = baseColors[i];
      colorMap[motif] = col;
      used.push(col);
    }
  });

  // generate extra colors if needed
  if (motifs.length > baseColors.length) {
    let extraIndex = 0;

    for (let i = baseColors.length; i < motifs.length; i++) {
      let candidate;
      do {
        // evenly distributed hues
        const hue = (360 * extraIndex) / (motifs.length || 1);
        candidate = `hsl(${hue}, 75%, 45%)`;

        extraIndex++;
      } while (
        isNearGrey(candidate) ||
        used.some((u) => areEqualRgb(u, candidate))
      );

      used.push(candidate);
      colorMap[motifs[i]] = candidate;
    }
  }
  return colorMap;
}

function isNearGrey(color) {
  const c = hsl(color);
  return c.s < 0.3;
}

function areEqualRgb(a, b) {
  const A = rgb(a);
  const B = rgb(b);
  return A.r === B.r && A.g === B.g && A.b === B.b;
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
