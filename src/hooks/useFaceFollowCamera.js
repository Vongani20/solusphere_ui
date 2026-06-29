import { useEffect, useRef, useState } from "react";

const ZOOM = 1.45;
const FOLLOW_STRENGTH = 0.82;
const MAX_PAN_RATIO = 0.28;
const DRIFT_DECAY = 0.96;

function mirrorFaceCenter(video, box) {
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  return {
    x: video.videoWidth - centerX,
    y: centerY,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Tracks the user's face and pans the webcam preview in the same direction they move.
 */
export default function useFaceFollowCamera(videoRef, enabled = true) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: ZOOM });
  const [tracking, setTracking] = useState({
    supported: false,
    active: false,
    message: "Initializing camera tracking...",
  });

  const offsetRef = useRef({ x: 0, y: 0 });
  const prevCenterRef = useRef(null);
  const detectorRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setTransform({ x: 0, y: 0, scale: ZOOM });
      offsetRef.current = { x: 0, y: 0 };
      prevCenterRef.current = null;
      return undefined;
    }

    let cancelled = false;
    let rafId = 0;

    async function initDetector() {
      if (typeof window.FaceDetector === "undefined") {
        setTracking({
          supported: false,
          active: false,
          message: "Move your face slowly and keep it inside the ring.",
        });
        return;
      }

      try {
        detectorRef.current = new window.FaceDetector({
          fastMode: true,
          maxDetectedFaces: 1,
        });
        if (!cancelled) {
          setTracking({
            supported: true,
            active: true,
            message: "Face tracking active — move naturally and stay in the ring.",
          });
        }
      } catch {
        setTracking({
          supported: false,
          active: false,
          message: "Center your face inside the ring.",
        });
      }
    }

    async function tick() {
      if (cancelled) return;

      const video = videoRef.current;
      const detector = detectorRef.current;

      if (!video || video.readyState < 2 || !detector) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      frameRef.current += 1;
      if (frameRef.current % 2 === 0) {
        try {
          const faces = await detector.detect(video);
          if (faces.length > 0 && faces[0].boundingBox) {
            const center = mirrorFaceCenter(video, faces[0].boundingBox);
            const viewportCenterX = video.videoWidth / 2;
            const viewportCenterY = video.videoHeight / 2;
            const maxPanX = video.videoWidth * MAX_PAN_RATIO;
            const maxPanY = video.videoHeight * MAX_PAN_RATIO;

            if (prevCenterRef.current) {
              const dx = center.x - prevCenterRef.current.x;
              const dy = center.y - prevCenterRef.current.y;
              offsetRef.current.x += dx * FOLLOW_STRENGTH;
              offsetRef.current.y += dy * FOLLOW_STRENGTH;
            } else {
              offsetRef.current.x += (center.x - viewportCenterX) * 0.15;
              offsetRef.current.y += (center.y - viewportCenterY) * 0.15;
            }

            offsetRef.current.x *= DRIFT_DECAY;
            offsetRef.current.y *= DRIFT_DECAY;
            offsetRef.current.x = clamp(offsetRef.current.x, -maxPanX, maxPanX);
            offsetRef.current.y = clamp(offsetRef.current.y, -maxPanY, maxPanY);

            prevCenterRef.current = center;
            setTransform({
              x: offsetRef.current.x,
              y: offsetRef.current.y,
              scale: ZOOM,
            });
            setTracking((current) => ({
              ...current,
              active: true,
              message: "Face tracking active — move naturally and stay in the ring.",
            }));
          } else {
            prevCenterRef.current = null;
            setTracking((current) => ({
              ...current,
              message: "Center your face inside the ring.",
            }));
          }
        } catch {
          prevCenterRef.current = null;
        }
      }

      rafId = window.requestAnimationFrame(tick);
    }

    initDetector().then(() => {
      rafId = window.requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      detectorRef.current = null;
      prevCenterRef.current = null;
      offsetRef.current = { x: 0, y: 0 };
    };
  }, [enabled, videoRef]);

  return { transform, tracking };
}
