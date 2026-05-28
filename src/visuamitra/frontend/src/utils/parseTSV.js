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
    const rawDecomp = safeParse(obj.Decomp_info); // Parsed into [Ref, A1, A2]

    
    /*console.log(`Sample: ${obj.SampleID}, GT: ${obj.GT}`);
    console.log("Full Sequences Array:", sequences);
    console.log("Full Decomp Array:", rawDecomp);*/

    const transformTrack = (arr, rMotif) => {
      // Check if arr exists and has the expected structure [motifs[], lengths[]]
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
        const rawUpper = String(m || "").toUpperCase().trim();
        const mLen = rawUpper.length || 1;
        const calculatedCopies = len / mLen;
        // Identify non-repetitive context
        const isNonRepetitive = calculatedCopies <= 1 || rawUpper.includes("N_REPETITIVE") || rawUpper.includes("FLANK");
        const activeMotifKey = isNonRepetitive ? rawUpper : getCanonicalMotif(m, safeRefMotif);
        const copies = isNonRepetitive ? calculatedCopies : len / (activeMotifKey.length || 1);
        // Group adjacent matching motifs
        if (finalMotifs.length > 0 && finalMotifs[finalMotifs.length - 1] === activeMotifKey) {
          finalLengths[finalLengths.length - 1] += len;
          finalCopies[finalCopies.length - 1] += copies;
        } else {
          finalMotifs.push(activeMotifKey); 
          finalLengths.push(len);
          finalCopies.push(copies);
        }
      }

      return { motifs: finalMotifs, lengths: finalLengths, copies: finalCopies };
    };

  // Map the raw tracks through transformer first
    let parsedDecomp = Array.isArray(rawDecomp) 
      ? rawDecomp.map(track => transformTrack(track, obj.Motif)) 
      : [];

    // Check homozygous missing tracks
    const hasA1Data = parsedDecomp[1] && parsedDecomp[1].motifs && parsedDecomp[1].motifs.length > 0;
    const hasA2Data = parsedDecomp[2] && parsedDecomp[2].motifs && parsedDecomp[2].motifs.length > 0;

    if (hasA1Data && !hasA2Data) {
      // clone Allele 1 over to Allele 2 slot
      parsedDecomp[2] = JSON.parse(JSON.stringify(parsedDecomp[1]));
    } else if (!hasA1Data && !hasA2Data) {
      // fallback stabilizer block
      const emptyTrack = { motifs: [], lengths: [], copies: [] };
      if (!parsedDecomp[1]) parsedDecomp[1] = emptyTrack;
      if (!parsedDecomp[2]) parsedDecomp[2] = emptyTrack;
    }
      
    const aLen1 = sequences[1]?.length || 0;
    const aLen2 = sequences[2]?.length || 0; 

    // Build the sanitized sample object with PRE-PARSED data
    const sampleData = { 
      ...obj, 
      alleleLen1: aLen1, 
      alleleLen2: aLen2, 
      sequences: sequences,
      meanMeth: meanMeth,
      SampleIdx: sIdx,
      parsedDecomp: parsedDecomp 
    };

    if (!groupedData.has(locusKey)) {
      // Use local transformTrack to ensure global reference is also squashed
      const actualRefTrack = (Array.isArray(rawDecomp) && rawDecomp.length > 0)
          ? transformTrack(rawDecomp[0], obj.Motif)
          : { motifs: [], lengths: [], copies: [] };

      groupedData.set(locusKey, {
        Chrom: chrom, Start: start, End: end,
        ID: obj.ID || "NA",
        Motif: obj.Motif || "NA",
        samples: {},
        refTrack: actualRefTrack,
        maxAlleleLen: Math.max(aLen1, aLen2)
      });
    }

    const locus = groupedData.get(locusKey);
    locus.samples[sIdx] = sampleData;
    
    const sName = obj.SampleID;
    if (sName && sName !== "NA") {
      locus.samples[sName] = sampleData;
    }
    
    locus.maxAlleleLen = Math.max(locus.maxAlleleLen, aLen1, aLen2);
  });
  console.log("Parsed Locus Data:", Array.from(groupedData.values()));
  return Array.from(groupedData.values());
}