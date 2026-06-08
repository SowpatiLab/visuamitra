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

  // Fragment logic for the parser
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
  if (!Array.isArray(motifs)) return {};

  // Force a strict alphabetical sort on all unique motifs
  // This guarantees absolute consistency across pagination chunks
  const uniqueCanonical = [...new Set(
    motifs
    .filter(m => !!m)
    .map(m => getCanonicalMotif(m, refMotif))
  )].sort((a, b) => a.localeCompare(b));
  
  const paletteMap = {
    Tableau10: d3Chromatic.schemeTableau10,
    Observable10: d3Chromatic.schemeObservable10, 
    Set1: d3Chromatic.schemeSet1,
    Set2: d3Chromatic.schemeSet2,
    Set3: d3Chromatic.schemeSet3,
    Paired: d3Chromatic.schemePaired,
    Dark2: d3Chromatic.schemeDark2,
    Accent: d3Chromatic.schemeAccent,
    Pastel1: d3Chromatic.schemePastel1,
    Pastel2: d3Chromatic.schemePastel2,
  };

  const baseColors = paletteMap[paletteName] || d3Chromatic.schemeTableau10;
  const colorMap = {};

  // ANCHOR THE EXPECTED MOTIF (Index 0)
  const canonicalRef = refMotif ? getCanonicalMotif(refMotif, refMotif) : "";
  if (canonicalRef) {
    const h = hsl(baseColors[0]);
    // If the first color of a custom palette is greyish, force a solid green
    if (isNearGrey(h)) {
      h.h = 130; h.s = 0.65; h.l = 0.50;
    }
    colorMap[canonicalRef] = h.toString();
  }

  // ASSIGN CONTRASTING COLORS SEQUENTIALLY TO SECONDARY MOTIFS
  let colorSlotPointer = 1; 

  uniqueCanonical.forEach((motif) => {
    if (motif === canonicalRef) return;

    const colorIndex = colorSlotPointer % baseColors.length;
    const col = baseColors[colorIndex];
    const h = hsl(col);

    // GREY EXCLUSION GUARD
    // If the palette color's saturation is low, transform it into a vibrant hue
    if (isNearGrey(h) || h.s < 0.25) {
      // Generate a dynamic hue angle using the position pointer to guarantee unique colors
      h.h = (15 + colorSlotPointer * 75) % 360; 
      h.s = 0.75; // Pump up saturation to prevent muddy greys
      h.l = 0.52; // Balance lightness
    }

    // INTRA-PALETTE CONTRAST ADJUSTMENTS
    // Apply contrasting lightness alterations so adjacent motifs look distinctly different
    const cycle = Math.floor(colorSlotPointer / baseColors.length);
    if (cycle > 0) {
      h.l = cycle % 2 === 1 ? Math.max(0.20, h.l - 0.20) : Math.min(0.82, h.l + 0.18);
      h.s = Math.min(1.0, h.s + 0.15);
    } else {
      if (colorSlotPointer % 2 === 0) {
        h.l = Math.max(0.24, h.l - 0.12);
      } else {
        h.l = Math.min(0.80, h.l + 0.10);
      }
    }

    colorMap[motif] = h.toString();
    colorSlotPointer++; 
  });

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

/**
 * Filters the global color map to only include motifs that are visible on current page.
 * * @param {Object} row - The active locus row data object containing all sample information.
 * @param {Array<number>} paginatedIndices - Array of indexes representing the samples currently on screen.
 * @param {Array<string>} availableSamples - The global array of all available sample names.
 * @param {Object} colorMap - The current global motif color map object.
 * @returns {Object} A filtered subset of the color map containing only active visible motifs.
 */
export function getVisibleColorMap(row, paginatedIndices, availableSamples, colorMap) {
  if (!row || !row.samples || !Array.isArray(paginatedIndices) || paginatedIndices.length === 0) {
    return {};
  }

  const visibleMotifs = new Set();
  const refMotifUpper = row.Motif?.toUpperCase();

  // Scan only the active page's samples
  paginatedIndices.forEach((idx) => {
    const sampleName = availableSamples[idx];
    const sample = row.samples[sampleName];

    if (sample && typeof sample !== 'string' && sample.parsedDecomp) {
      sample.parsedDecomp.forEach((track) => {
        if (track && Array.isArray(track.motifs)) {
          track.motifs.forEach((motif, i) => {
            // Confirm the motif is drawing structural blocks on screen
            if (motif && track.copies && track.copies[i] > 0) {
              const cleanMotif = motif.trim().toUpperCase();
              const canon = getCanonicalMotif(cleanMotif, refMotifUpper);
              visibleMotifs.add(canon);
            }
          });
        }
      });
    }
  });

  // Build the filtered subset map
  const filteredMap = {};
  visibleMotifs.forEach((motif) => {
    if (colorMap[motif]) {
      filteredMap[motif] = colorMap[motif];
    }
  });

  // Keep the main Expected Motif anchored in legend baseline
  const canonicalRef = refMotifUpper ? getCanonicalMotif(row.Motif, row.Motif) : "";
  if (canonicalRef && colorMap[canonicalRef]) {
    filteredMap[canonicalRef] = colorMap[canonicalRef];
  }

  return filteredMap;
}
