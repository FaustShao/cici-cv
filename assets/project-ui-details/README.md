# High-resolution UI previews

Original artwork from the user-uploaded `safepaw family UI放大图.zip` (10 mobile screens), plus the supplied device-management image matched to the original exported node 54:2137 and `Dream UI放大图.zip` (5 landscape screens). Files retain their original pixel dimensions and transparency, converted to lossless WebP without resizing. `manifest.json` records the original names and exact existing project node IDs.

These 16 UI images open the shared `project-ui-zoom.js` native dialog. Underlying project artwork, typography and layout remain unchanged. The original-resolution image loads on click. Each project is an independent ordered gallery: Dream follows Page 1–5; SafePaw follows the board from top to bottom and left to right, with device management after the two pet-card screens. Arrow buttons (including touch) and Left/Right keys browse the same gallery; endpoints do not wrap. Click outside the image, the close button, or Escape to exit; clicking the image keeps it open. Focus and document scroll return to the original UI trigger. No project loading overlay is added.

Validation: `node tests/project-ui-zoom.cjs` with the static website served on port 8770 under /cici-cv/.
