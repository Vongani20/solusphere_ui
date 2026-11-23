/**
 * Centre-crops an image file to a square and resizes it (default 512px), returning a JPEG data URL.
 * Keeps profile photo uploads small and consistent, even straight from a phone camera.
 */
export async function squareImageDataUrl(file, size = 512, quality = 0.86) {
  if (!file || !file.type?.startsWith("image/")) {
    throw new Error("Choose an image file (JPG, PNG or WEBP).");
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("That image could not be opened."));
      image.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const target = Math.min(size, side);
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background instead of black
    ctx.fillRect(0, 0, target, target);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
