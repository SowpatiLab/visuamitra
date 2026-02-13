export function generatePalette(motifs) {
  const baseColors = [
    "#E41A1C", // red
    "#377EB8", // blue
    "#4DAF4A", // green
    "#984EA3", // purple
    "#FF7F00", // orange
    "#FFFF33", // yellow
    "#A65628", // brown
    "#F781BF", // pink
    "#1B9E77", // teal
    "#D95F02", // burnt orange
    "#7570B3", // indigo
    "#E7298A", // magenta
    "#66A61E", // olive
    "#E6AB02", // mustard
    "#A6761D", // ochre
    "#666666ff", // dark neutral (NOT grey background)
    "#1F78B4", // strong blue
    "#33A02C", // strong green
    "#FB9A99", // light red
    "#CAB2D6", // lavender
  ];

  const palette = {};
  motifs.forEach((motif, i) => {
    palette[motif] = baseColors[i % baseColors.length];
  });

  return palette;
}
