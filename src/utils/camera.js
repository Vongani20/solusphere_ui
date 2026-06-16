export function getCameraErrorMessage(error) {
  if (!window.isSecureContext) {
    return "Camera needs a secure HTTPS site. Use the HTTPS CloudFront URL or localhost to scan your face.";
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return "Camera is not available in this browser. Try Chrome, Edge, or another supported browser.";
  }

  switch (error?.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera permission was blocked. Allow camera access in the browser settings and try again.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera was found on this device.";
    case "NotReadableError":
    case "TrackStartError":
      return "The camera is already in use by another app. Close it and try again.";
    default:
      return "Cannot access camera. Check browser permissions and try again.";
  }
}

export async function requestUserCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException("Camera API unavailable", "NotSupportedError");
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
    },
  });
}
