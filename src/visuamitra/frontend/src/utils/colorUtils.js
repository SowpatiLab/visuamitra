import * as d3Chromatic from "d3-scale-chromatic";
import { rgb, hsl } from "d3-color";

/**
 * Generates all cyclic rotations of a string.
 * Example: "CAG" -> ["CAG", "AGC", "GCA"]
 */
function getCyclicVariants(motif) {
  const n = motif.length;
  const variants = [];
  for (let i = 0; i < n; i++) {
    variants.push(motif.slice(i) + motif.slice(0, i));
  }
  
  return variants;
}

export function getCanonicalMotif(motif, rMotif, allowFragments = false) {
  if (!motif) return "";
  const upperM = motif.toUpperCase();
  const upperR = rMotif ? rMotif.toUpperCase() : null;

  // NEW: Fragment logic for the parser
 // if (allowFragments && upperR && upperM.length < upperR.length) {
   // if ((upperR + upperR).includes(upperM)) return upperR;
  //}
  
  if (upperR && upperR.length === upperM.length) {
    const variants = getCyclicVariants(upperM);
    if (variants.includes(upperR)) return upperR;
  }

  const variants = getCyclicVariants(upperM);
  return variants.sort()[0];
}

export function generateMotifColors(motifs, paletteName = "Observable10", refMotif = "") {
  // 1. Safety Guard: If motifs isn't an array, return empty map immediately
  if (!Array.isArray(motifs)) return {};

  // 2. Canonicalize and filter out any nulls/undefined
  const uniqueCanonical = [...new Set(
    motifs
    .filter(m => !!m)
    .map(m => getCanonicalMotif(m, refMotif))
  )].sort();
  
  const paletteMap = {
    Tableau10: d3Chromatic.schemeTableau10,
    Observable10: d3Chromatic.schemeObservable10, // Excellent color separation
    Set1: d3Chromatic.schemeSet1,
    Set2: d3Chromatic.schemeSet2,
    Set3: d3Chromatic.schemeSet3,
    Paired: d3Chromatic.schemePaired,
    Dark2: d3Chromatic.schemeDark2,
    Accent: d3Chromatic.schemeAccent,
    Pastel1: d3Chromatic.schemePastel1,
    Pastel2: d3Chromatic.schemePastel2,
  };

  // Fallback to Tableau10 if the passed paletteName doesn't exist
  const baseColors = paletteMap[paletteName] || d3Chromatic.schemeTableau10;

  const colorMap = {};
  const used = [];

  // 3. IMPORTANT: Use uniqueCanonical for the loop, not 'motifs'
  // 3. Loop through canonical motifs and apply saturation control
  uniqueCanonical.forEach((motif, i) => {
    let finalColor;

    if (i < baseColors.length) {
      // Get the base color from the palette
      const col = baseColors[i];
      
      const h = hsl(col);
      //h.s = 0.8; // Set saturation to 40% (0.0 to 1.0)
      //h.l = 0.6; // Optional: Adjust lightness too if needed
     // h.opacity = 0.9;  //opacity 
      finalColor = h.toString();
      
      colorMap[motif] = finalColor;
      used.push(finalColor);
    } else {
      // Fallback for high-diversity regions (already uses HSL)
      let extraIndex = i - baseColors.length;
      let candidate;
      do {
        const hue = (360 * extraIndex) / (uniqueCanonical.length || 1);
        // Ensure fallback also matches the lower saturation (e.g., 40%)
        candidate = hsl(hue, 0.4, 0.5).toString(); 
        extraIndex++;
      } while (used.some((u) => areEqualRgb(u, candidate)));
      
      colorMap[motif] = candidate;
      used.push(candidate);
    }
  });
  console.log("Final colormap keys:", Object.keys(colorMap));
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
