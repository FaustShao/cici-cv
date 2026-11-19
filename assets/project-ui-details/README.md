# High-resolution UI previews

Original artwork from the user-uploaded `safepaw family UI放大图.zip` (10 mobile screens) and `Dream UI放大图.zip` (5 landscape screens). Files retain their original pixel dimensions and transparency, converted to lossless WebP without resizing. `manifest.json` records the original names and exact existing project node IDs.

Only these 15 UI images open the shared `project-ui-zoom.js` native dialog. Underlying project artwork, typography and layout remain unchanged. The high-resolution image loads on click. Click outside the image, the close button, or Escape to exit; clicking the image keeps it open. Focus and document scroll return to the original UI trigger. No project loading overlay is added.

Validation: `node tests/project-ui-zoom.cjs` with the static website served on port 8765.
