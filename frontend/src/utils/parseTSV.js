export function parseTSV(text) {
  const lines = text.trim().split("\n");
  const header = lines[0].split("\t");
  const body = lines.slice(1);

  return body.map((l, rowIdx) => {
    const fields = l.split("\t");
    const obj = {};

    header.forEach((h, i) => {
      obj[h] = fields[i];
    });

    let alleleLen1 = 0;
    let alleleLen2 = 0;

    if (obj.Sequences) {
      const matches = obj.Sequences.match(/['"]([ACGTNacgtn]+)['"]/g);

      if (matches && matches.length >= 3) {
        const seq1 = matches[1].replace(/['"]/g, "");
        const seq2 = matches[2].replace(/['"]/g, "");

        alleleLen1 = seq1.length;
        alleleLen2 = seq2.length;
      }
    }

    obj.alleleLen1 = alleleLen1;
    obj.alleleLen2 = alleleLen2;

    // Debug 
//    console.log(
//      `[TSV row ${rowIdx}]`,
//      "alleleLen1:", alleleLen1,
//      "alleleLen2:", alleleLen2,
      //"Sequences:", obj.Sequences
//    );

    return obj;
  });
}
