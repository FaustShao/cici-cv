// Canvas "middle" is based on the font's em box, which WebKit and Chromium
// position differently. Align the painted glyphs inside the sign or atlas cell.
export function letteringBaseline(context, text, centerY) {
  context.textBaseline = "alphabetic";
  const ink = context.measureText(text);
  return centerY + (ink.actualBoundingBoxAscent - ink.actualBoundingBoxDescent) / 2;
}
