export function parseTSV(text) {
  if (!text) return [];

  // 1. Split by ANY newline (Windows \r\n or Unix \n)
  const allLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  console.log("DEBUG: Total lines detected:", allLines.length);
  if (allLines.length > 0) {
    console.log("DEBUG: First 3 lines raw:", allLines.slice(0, 3));
  }

  // 2. Filter out metadata
  const cleanLines = allLines.filter(line => !line.startsWith("##"));
  console.log("DEBUG: Lines remaining after ## filter:", cleanLines.length);

  if (cleanLines.length < 2) {
    // If this hits, the 'allLines' either only had ## lines or the split failed
    return [];
  }

  const header = cleanLines[0].split("\t").map(h => h.trim());
  const body = cleanLines.slice(1);

  const groupedData = new Map();

  body.forEach((line) => {
    const fields = line.split("\t");
    const obj = {};
    header.forEach((h, i) => { obj[h] = fields[i] || ""; });

    const chrom = obj.Chrom || obj.CHROM || "NA";
    const start = obj.Start || obj.START || "NA";
    const end = obj.End || obj.END || "NA";
    const locusKey = `${chrom}_${start}_${end}`;

    // ... (Your Sequence parsing logic stays here) ...
    let aLen1 = 0, aLen2 = 0;
    try {
      if (obj.Sequences && obj.Sequences !== "") {
        const seqArray = JSON.parse(obj.Sequences.replace(/'/g, '"'));
        aLen1 = seqArray[1]?.length || 0;
        aLen2 = seqArray[2]?.length || aLen1;
      }
    } catch (e) {}

    const sampleData = { ...obj, alleleLen1: aLen1, alleleLen2: aLen2, 
                         SampleIdx: parseInt(obj.SampleIdx) || 0 };

    if (!groupedData.has(locusKey)) {
      groupedData.set(locusKey, {
        Chrom: chrom, Start: start, End: end,
        samples: { [sampleData.SampleIdx]: sampleData },
        maxAlleleLen: Math.max(aLen1, aLen2)
      });
    } else {
      const locus = groupedData.get(locusKey);
      locus.samples[sampleData.SampleIdx] = sampleData;
      locus.maxAlleleLen = Math.max(locus.maxAlleleLen, aLen1, aLen2);
    }
  });

  return Array.from(groupedData.values());
}