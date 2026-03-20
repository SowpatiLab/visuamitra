// 20-shade gradient: virdis
export const palette = [
  "#fde725", // rgb(253, 231, 37)
  "#dde318", // rgb(221, 227, 24)
  "#bade28", // rgb(186, 222, 40)
  "#95d840", // rgb(149, 216, 64)
  "#75d054", // rgb(117, 208, 84)
  "#56c667", // rgb(86, 198, 103)
  "#3dbc74", // rgb(61, 188, 116)
  "#29af7f", // rgb(41, 175, 127)
  "#20a386", // rgb(32, 163, 134)
  "#1f968b", // rgb(31, 150, 139)
  "#238a8d", // rgb(35, 138, 141)
  "#287d8e", // rgb(40, 125, 142)
  "#2d718e", // rgb(45, 113, 142)
  "#33638d", // rgb(51, 99, 141)
  "#39558c", // rgb(57, 85, 140)
  "#404688", // rgb(64, 70, 136)
  "#453781", // rgb(69, 55, 129)
  "#482576", // rgb(72, 37, 118)
  "#481467", // rgb(72, 20, 103)
  "#440154", // rgb(68, 1, 84)
];


 // Map methylation level (0–100) to one of 20 discrete colors
 
export function getGradientColor(methValue) {
  if (methValue == null || isNaN(methValue)) return palette[0];

  // Clamp to 0–100
  const v = Math.max(0, Math.min(100, methValue));

  // Each color represents 5 units
  const idx = Math.floor(v / 5);

  return palette[Math.min(idx, palette.length - 1)];
}
