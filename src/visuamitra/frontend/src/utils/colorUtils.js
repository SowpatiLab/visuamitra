import * as d3Chromatic from "d3-scale-chromatic";
import { rgb, hsl } from "d3-color";

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

  if (upperR && upperR.length === upperM.length) {
    const variants = getCyclicVariants(upperM);
    if (variants.includes(upperR)) return upperR;
  }

  const variants = getCyclicVariants(upperM);
  return variants.sort()[0];
}

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

export function generateMotifColors(motifs, paletteName = "Observable10", refMotif = "") {
  if (!Array.isArray(motifs) || motifs.length === 0) return {};

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

  const baseColors = paletteMap[paletteName] || d3Chromatic.schemeObservable10;
  const colorMap = {};

  const canonicalRef = refMotif ? getCanonicalMotif(refMotif, refMotif) : "";
  const paletteBaseHue = hsl(baseColors[0]).h || 0;

  if (canonicalRef) {
    const h = hsl(baseColors[0]);
    if (isNearGrey(h)) {
      h.h = 130; h.s = 0.65; h.l = 0.50;
    }
    colorMap[canonicalRef] = h.toString();
  }

  motifs.forEach((m) => {
    if (!m) return;
    
    // Support object format { motif, copies } or plain string
    const rawStr = typeof m === "string" ? m : m.motif;
    const copies = typeof m === "object" && m.copies != null ? m.copies : 2;

    if (!rawStr || copies <= 1) return; // Skip non-repeating sequence items

    const clean = rawStr.trim().toUpperCase();
    if (
      clean.includes("NON_REPETITIVE") || 
      clean.includes("NON-REPETITIVE") || 
      clean.includes("FLANK")
    ) {
      return;
    }

    const canon = getCanonicalMotif(clean, refMotif);
    if (!canon || canon === canonicalRef || colorMap[canon]) return;

    const hash = hashString(canon);
    const hueStep = (hash * 137.508) % 360;
    const finalHue = (paletteBaseHue + hueStep) % 360;

    const gcCount = (canon.match(/[GC]/g) || []).length;
    const gcRatio = gcCount / canon.length;

    const lightness = Math.max(0.28, Math.min(0.72, 0.45 + (hash % 3) * 0.12 - (gcRatio * 0.1)));
    const saturation = 0.65 + ((hash >> 4) % 4) * 0.08;

    const c = hsl(finalHue, saturation, lightness);
    if (isNearGrey(c)) {
      c.s = 0.75;
      c.l = 0.50;
    }

    colorMap[canon] = c.toString();
  });

  return colorMap;
}

function isNearGrey(color) {
  const c = hsl(color);
  return c.s < 0.3;
}

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

  return function getColor(methValue) {
    if (methValue == null || isNaN(methValue)) return interpolator(0);
    const v = Math.max(0, Math.min(100, methValue)) / 100;
    return interpolator(1 - v);
  };
}

export function getVisibleColorMap(row, paginatedIndices, availableSamples, colorMap) {
  if (!row || !row.samples || !Array.isArray(paginatedIndices) || paginatedIndices.length === 0) {
    return {};
  }

  const visibleMotifs = new Set();
  const refMotifUpper = row.Motif?.toUpperCase();

  paginatedIndices.forEach((idx) => {
    const sampleName = availableSamples[idx];
    const sample = row.samples[sampleName];

    if (sample && typeof sample !== 'string' && sample.parsedDecomp) {
      sample.parsedDecomp.forEach((track) => {
        if (track && Array.isArray(track.motifs)) {
          track.motifs.forEach((motif, i) => {
            const copies = track.copies && track.copies[i] != null ? Number(track.copies[i]) : 0;

            // STRICT FILTER: Only repeat motifs (copies > 1) are given colors
            if (motif && copies > 1) {
              const cleanMotif = motif.trim().toUpperCase();
              const canon = getCanonicalMotif(cleanMotif, refMotifUpper);
              visibleMotifs.add(canon);
            }
          });
        }
      });
    }
  });

  const filteredMap = {};
  visibleMotifs.forEach((motif) => {
    if (colorMap[motif]) {
      filteredMap[motif] = colorMap[motif];
    }
  });

  // Always retain the expected Reference Motif in legend
  const canonicalRef = refMotifUpper ? getCanonicalMotif(row.Motif, row.Motif) : "";
  if (canonicalRef && colorMap[canonicalRef]) {
    filteredMap[canonicalRef] = colorMap[canonicalRef];
  }

  return filteredMap;
}