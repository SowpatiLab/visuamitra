import { getCanonicalMotif } from "./colorUtils";

export function parseTSV(text) {
  if (!text) return [];

  const allLines = text.split(/\r?\n/).filter(line => line.trim());
  const cleanLines = allLines.filter(line => !line.startsWith("##"));

  if (cleanLines.length < 2) return [];

  const header = cleanLines[0].split("\t").map(h => h.trim());
  const body = cleanLines.slice(1);
  const groupedData = new Map();

  body.forEach((line) => {
    const fields = line.split("\t");
    const obj = {};
    header.forEach((h, i) => { obj[h] = (fields[i] || "").trim(); });

    if (obj.Chrom === "Chrom" || obj.Start === "Start" || !obj.SampleIdx) return;

    const sIdx = parseInt(obj.SampleIdx);
    if (isNaN(sIdx)) return;

    const chrom = obj.Chrom || obj.CHROM || "NA";
    const start = obj.Start || obj.START || "NA";
    const end = obj.End || obj.END || "NA";
    const locusKey = `${chrom}_${start}_${end}`;

    const safeParse = (str) => {
      if (!str || str === "NA") return [];
      try {
        const jsonReady = str
          .replace(/'/g, '"')
          .replace(/\bNone\b/g, 'null'); 
        
        return JSON.parse(jsonReady);
      } catch (err) {
        console.warn("Parse error for string:", str, err);
        return [];
      }
    };
    const sequences = safeParse(obj.Sequences);
    const meanMeth = safeParse(obj.Mean_meth);
    const rawDecomp = safeParse(obj.Decomp_info);

    const transformTrack = (arr, rMotif) => {
      if (!Array.isArray(arr) || !Array.isArray(arr[0]) || !Array.isArray(arr[1])) {
        return { motifs: [], lengths: [], copies: [] };
      }
      
      const rawMotifs = arr[0];
      const rawLengths = arr[1];
      const safeRefMotif = String(rMotif || "").toUpperCase();

      const finalMotifs = [];
      const finalLengths = [];
      const finalCopies = [];

      for (let i = 0; i < rawMotifs.length; i++) {
        const m = rawMotifs[i];
        const len = rawLengths[i];
        const canonical = getCanonicalMotif(m, safeRefMotif);
        const mLen = canonical.length || 1;
        const copies = len / mLen;

        if (finalMotifs.length > 0 && finalMotifs[finalMotifs.length - 1] === canonical) {
          finalLengths[finalLengths.length - 1] += len;
          finalCopies[finalCopies.length - 1] += copies;
        } else {
          finalMotifs.push(canonical);
          finalLengths.push(len);
          finalCopies.push(copies);
        }
      }

      return { motifs: finalMotifs, lengths: finalLengths, copies: finalCopies };
    };

   // Map raw tracks through transformer
    let parsedDecomp = Array.isArray(rawDecomp) 
      ? rawDecomp.map(track => transformTrack(track, obj.Motif)) 
      : [];

    // Keep ALL elements because backend payload doesn't include a Ref track in Decomp_info
    const sampleAlleleTracks = parsedDecomp.slice(1);

    // If it's a standard homozygous variant (1 track comes back), duplicate it for diploid display layout
    if (sampleAlleleTracks.length === 1) {
      sampleAlleleTracks.push(JSON.parse(JSON.stringify(sampleAlleleTracks[0])));
    }

    // Fallback safeguard if empty
    if (sampleAlleleTracks.length === 0) {
      sampleAlleleTracks.push({ motifs: [], lengths: [], copies: [] });
    }
      
    // Keep all elements from sequences array as well (no .slice(1))
    const trackLengths = (Array.isArray(sequences) ? sequences : []).map(seq => seq?.length || 0);
    
    // Ensure trackLengths array matches the length of sampleAlleleTracks exactly
    while (trackLengths.length < sampleAlleleTracks.length) {
      trackLengths.push(0);
    }
    if (trackLengths.length > sampleAlleleTracks.length) {
      trackLengths.length = sampleAlleleTracks.length;
    }

    const maxSampleTrackLen = trackLengths.length > 0 ? Math.max(...trackLengths) : 0;

    // final sample container object
    const sampleData = { 
      ...obj, 
      trackLengths: trackLengths,
      sequences: sequences,
      meanMeth: meanMeth,
      SampleIdx: sIdx,
      parsedDecomp: sampleAlleleTracks 
    };

    if (!groupedData.has(locusKey)) {
      const actualRefTrack = (Array.isArray(rawDecomp) && rawDecomp.length > 0)
          ? transformTrack(rawDecomp[0], obj.Motif)
          : { motifs: [], lengths: [], copies: [] };

      groupedData.set(locusKey, {
        Chrom: chrom, Start: start, End: end,
        ID: obj.ID || "NA",
        Motif: obj.Motif || "NA",
        samples: {},
        refTrack: actualRefTrack,
        maxAlleleLen: maxSampleTrackLen
      });
    }

    const locus = groupedData.get(locusKey);
    locus.samples[sIdx] = sampleData;
    
    const sName = obj.SampleID;
    if (sName && sName !== "NA") {
      locus.samples[sName] = sampleData;
    }
    
    locus.maxAlleleLen = Math.max(locus.maxAlleleLen, maxSampleTrackLen);
  });

  console.log("Parsed Locus Data:", Array.from(groupedData.values()));
  return Array.from(groupedData.values());
}