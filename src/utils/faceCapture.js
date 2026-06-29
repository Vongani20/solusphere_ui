/**
 * Capture the visible mirrored + panned webcam frame for face upload.
 */
export function captureFollowedFace(video, transform = { x: 0, y: 0, scale: 1 }) {
  if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const canvas = document.createElement("canvas");
  const size = Math.min(video.videoWidth, video.videoHeight);
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const sourceX = (video.videoWidth - size) / 2;
  const sourceY = (video.videoHeight - size) / 2;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(-transform.scale, transform.scale);
  ctx.translate(transform.x, transform.y);
  ctx.drawImage(
    video,
    sourceX,
    sourceY,
    size,
    size,
    -size / 2,
    -size / 2,
    size,
    size
  );
  ctx.restore();

  return canvas;
}

export function canvasToJpegBlob(canvas, quality = 0.92) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}
