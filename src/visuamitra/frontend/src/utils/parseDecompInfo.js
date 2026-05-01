// utils/parseDecompInfo.js
import { getCanonicalMotif } from "./colorUtils";

function extractCopyNumbers(decompSeq, refMotif) {
  if (!decompSeq) return {};
  const map = {};
  const regex = /\(([^)]+)\)(\d+)/g;
  let match;

  while ((match = regex.exec(decompSeq)) !== null) {
    // We canonicalize the motif from the sequence string (e.g., "(CAG)10")
    const canonMotif = getCanonicalMotif(match[1], refMotif);
    map[canonMotif] = Number(match[2]);
  }
  return map;
}

export function parseDecompFromTSV(decompInfoStr, decompSeq, refMotif) {
  if (!decompInfoStr || decompInfoStr === "NA") {
    const empty = { motifs: [], lengths: [], copies: [] };
    return { ref: empty, a1: empty, a2: empty };
  }

  // Handle Python-style single quotes in the JSON string
  const cleaned = decompInfoStr.replace(/'/g, '"');
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = null;
  }

  const copyMap = extractCopyNumbers(decompSeq, refMotif);

  const extract = (arr) => {
    if (!Array.isArray(arr)) return { motifs: [], lengths: [], copies: [] };
    
    const motifs = Array.isArray(arr[0]) ? arr[0] : [];
    const lengths = Array.isArray(arr[1]) ? arr[1] : [];

    // 1. Calculate Copies mathematically (Math Sync)
    const copies = motifs.map((m, i) => {
      const segmentBp = lengths[i] || 0;
      const motifBp = (m || "").length;
      if (motifBp === 0) return 0;

      const calc = segmentBp / motifBp;
      return Number.isInteger(calc) ? calc : Number(calc.toFixed(1));
    });

    // 2. We keep the original motifs for the UI, 
    // but the DecompositionPlot will use getCanonicalMotif(m) 
    // internally when it looks up the color in the colorMap.
    
    return { motifs, lengths, copies };
  };

  // Case 1: Standard [Ref, A1, A2] structure
  if (Array.isArray(parsed) && parsed.length >= 3) {
    return {
      ref: extract(parsed[0]),
      a1: extract(parsed[1]),
      a2: extract(parsed[2]),
    };
  }

  // Case 2: Only 2 tracks (likely homozygous or missing one)
  if (Array.isArray(parsed) && parsed.length === 2) {
    const e = extract(parsed);
    return { ref: e, a1: e, a2: e };
  }

  const fallback = { motifs: [], lengths: [], copies: [] };
  return { ref: fallback, a1: fallback, a2: fallback };
}