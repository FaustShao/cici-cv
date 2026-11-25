// Some WebKit displays keep rendering to WebGL but cannot present a canvas.
// A nonzero, origin-clean test canvas returns "data:," on those displays.
export function lacksCanvasBitmap() {
  const probe = document.createElement("canvas");
  probe.width = 500;
  probe.height = 350;
  try {
    const ctx = probe.getContext("2d");
    if (!ctx) return false;
    ctx.fillRect(0, 0, probe.width, probe.height);
    return probe.toDataURL() === "data:,";
  } catch {
    // A browser that restricts pixel extraction can still present its canvas.
    return false;
  } finally {
    probe.width = probe.height = 0;
  }
}

export function createSceneImage(gl, canvas) {
  let buffer, pixels, width = 0, height = 0, last = -Infinity;
  let displayed, pending = false;
  return time => {
    if (pending || time - last < 1000 / 15 || gl.isContextLost()) return;
    last = time;
    if (width !== gl.drawingBufferWidth || height !== gl.drawingBufferHeight) {
      width = gl.drawingBufferWidth;
      height = gl.drawingBufferHeight;
      if (!width || !height) { buffer = undefined; return; }
      // A 32-bit BMP accepts WebGL's bottom-up rows without a vertical copy.
      buffer = new ArrayBuffer(54 + width * height * 4);
      const header = new DataView(buffer);
      header.setUint16(0, 0x4d42, true);
      header.setUint32(2, buffer.byteLength, true);
      header.setUint32(10, 54, true);
      header.setUint32(14, 40, true);
      header.setUint32(18, width, true);
      header.setUint32(22, height, true);
      header.setUint16(26, 1, true);
      header.setUint16(28, 32, true);
      pixels = new Uint8Array(buffer, 54);
      header.setUint32(34, pixels.length, true);
    }
    if (!buffer) return;
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    for (let i = 0; i < pixels.length; i += 4) {
      const red = pixels[i];
      pixels[i] = pixels[i + 2];
      pixels[i + 2] = red;
      pixels[i + 3] = 255;
    }
    pending = true;
    const image = new Image();
    image.alt = "";
    image.className = "scene-image";
    image.setAttribute("aria-hidden", "true");
    const url = URL.createObjectURL(new Blob([buffer], { type: "image/bmp" }));
    image.onload = () => {
      if (displayed) {
        displayed.replaceWith(image);
        URL.revokeObjectURL(displayed.src);
      } else {
        canvas.after(image);
      }
      displayed = image;
      pending = false;
    };
    image.onerror = () => { URL.revokeObjectURL(url); pending = false; };
    image.src = url;
  };
}
