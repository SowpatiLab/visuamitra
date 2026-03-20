export function parseTSV(text) {
  const lines = text.trim().split("\n");
  const header = lines[0].split("\t");
  const body = lines.slice(1);

  return body.map((l) => {
    const fields = l.split("\t");
    const obj = {};

    header.forEach((h, i) => {
      obj[h] = fields[i];
    });

    let alleleLen1 = 0;
    let alleleLen2 = 0;

    if (obj.Sequences) {
      try {
        // Clean the Python list string format to valid JSON
        const seqArray = JSON.parse(obj.Sequences.replace(/'/g, '"'));
        if (Array.isArray(seqArray)) {
          // seqArray[0] is REF, [1] is Alt1, [2] is Alt2
          alleleLen1 = seqArray[1]?.length || 0;
          alleleLen2 = seqArray[2]?.length || alleleLen1;
        }
      } catch (e) {
        console.error("Error parsing sequences for lengths:", e);
      }
    }

    obj.alleleLen1 = alleleLen1;
    obj.alleleLen2 = alleleLen2;

    return obj;
  });
}
