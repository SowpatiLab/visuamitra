// utils/parseDecompInfo.js

function extractCopyNumbers(decompSeq) {
  if (!decompSeq) return {};

  const map = {};
  const regex = /\(([^)]+)\)(\d+)/g;
  let match;

  while ((match = regex.exec(decompSeq)) !== null) {
    const motif = match[1];
    const copy = Number(match[2]);
    map[motif] = copy;
  }

  return map;
}

export function parseDecompFromTSV(decompInfoStr, decompSeq) {
  if (!decompInfoStr || decompInfoStr === "NA") {
    return {
      ref: { motifs: [], lengths: [], copies: [] },
      a1: { motifs: [], lengths: [], copies: [] },
      a2: { motifs: [], lengths: [], copies: [] },
    };
  }

  const cleaned = decompInfoStr.replace(/'/g, '"');

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = null;
  }

  const copyMap = extractCopyNumbers(decompSeq);

  const extract = (arr) => {
    const motifs = Array.isArray(arr[0]) ? arr[0] : [];
    const lengths = Array.isArray(arr[1]) ? arr[1] : [];

    const copies = motifs.map((m) =>
      copyMap.hasOwnProperty(m) ? copyMap[m] : null
    );


    return { motifs, lengths, copies };
  };

  if (
    Array.isArray(parsed) &&
    parsed.length >= 3 &&
    Array.isArray(parsed[0])
  ) {
    return {
      ref: extract(parsed[0]),
      a1: extract(parsed[1]),
      a2: extract(parsed[2]),
    };
  }

  if (Array.isArray(parsed) && parsed.length === 2) {
    const e = extract(parsed);
    return { ref: e, a1: e, a2: e };
  }

  return {
    ref: { motifs: [], lengths: [], copies: [] },
    a1: { motifs: [], lengths: [], copies: [] },
    a2: { motifs: [], lengths: [], copies: [] },
  };
}
