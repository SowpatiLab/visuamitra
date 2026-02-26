export function parseTSVLine(line) {
  const fields = line.split("\t").map((v) => v.trim());

  // List of TSV columns from your backend
  const [
    Chrom,
    Start,
    End,
    ID,
    Motif,
    Motif_size,
    GT,
    Sequences,
    Read_support,
    Decomp_seq,
    Decomp_info,
    Unique_motifs,
    Mean_meth,
    Meth_tag,
  ] = fields;

  let alleleLen1 = 0;
  let alleleLen2 = 0;

  if (Sequences) {
    const matches = Sequences.match(/['"]([ACGTNacgtn]+)['"]/g);

    if (matches && matches.length >= 3) {
      const seq1 = matches[1].replace(/['"]/g, "");
      const seq2 = matches[2].replace(/['"]/g, "");

      alleleLen1 = seq1.length;
      alleleLen2 = seq2.length;
    }
  }

  return {
    Chrom,
    Start: Number(Start),
    End: Number(End),
    ID,
    Motif,
    Motif_size: Number(Motif_size),
    GT,
    Sequences,
    Read_support,
    Decomp_seq,
    Decomp_info,
    Unique_motifs,
    Mean_meth,
    Meth_tag,
    alleleLen1,
    alleleLen2,
  };
}
