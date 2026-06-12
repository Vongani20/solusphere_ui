import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CameraIcon,
  FaceSmileIcon,
} from "@heroicons/react/24/outline";
import FaceScanGuide from "../components/FaceScanGuide";
import api, { getApiError, saveSession } from "../services/api";

export default function FaceLogin() {
  const [capturedImage, setCapturedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let stream;

    async function startWebcam() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError("Cannot access camera. Check browser permissions.");
      }
    }

    startWebcam();
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const captureFace = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Camera is not ready yet.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Failed to capture image.");
        return;
      }
      if (capturedImage?.url) URL.revokeObjectURL(capturedImage.url);
      setCapturedImage({ blob, url: URL.createObjectURL(blob) });
      setError("");
    }, "image/jpeg");
  };

  const handleFaceLogin = async () => {
    if (!capturedImage) {
      setError("Capture your face first.");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("face", capturedImage.blob, "face.jpg");

    try {
      const res = await api.post("/auth/face-login", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      saveSession({ token: res.data.token, user: res.data.user });
      navigate("/dashboard");
    } catch (err) {
      setError(getApiError(err, "Face not recognized."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-primary to-cyan-700 p-4">
      <div className="w-full max-w-5xl">
        <Link to="/login" className="mb-5 inline-flex items-center gap-2 font-semibold text-white hover:text-cyan-100">
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Login
        </Link>

        <div className="rounded-lg border border-white/15 bg-white p-6 shadow-2xl lg:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white">
                <FaceSmileIcon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-950">Face Login</h1>
                <p className="text-sm text-slate-500">Biometric sign-in with the registered face profile</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <FaceScanGuide
                videoRef={videoRef}
                title="Account Security"
                description="Align your face inside the tracking circle."
                status={capturedImage ? "Face captured. Confirm the image to sign in." : "Move slowly and keep your eyes visible."}
              />
              <canvas ref={canvasRef} className="hidden" />
              <button
                type="button"
                onClick={captureFace}
                disabled={loading}
                className="btn btn-secondary mt-4 inline-flex w-full items-center justify-center gap-2"
              >
                <CameraIcon className="h-5 w-5" />
                {capturedImage ? "Retake Scan" : "Start Scan"}
              </button>
            </div>

            <div className="flex flex-col">
              {capturedImage ? (
                <>
                  <FaceScanGuide
                    imageUrl={capturedImage.url}
                    cameraActive={false}
                    title="Face Captured"
                    description="Review the scan before authentication."
                    status="Ready to compare with AWS Rekognition."
                    compact
                  />
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleFaceLogin}
                      disabled={loading}
                      className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Authenticating..." : "Login"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCapturedImage(null)}
                      disabled={loading}
                      className="btn btn-secondary"
                    >
                      Retake
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex min-h-full flex-1 flex-col justify-center rounded-lg border border-slate-200 bg-slate-50 p-6">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white">
                    <FaceSmileIcon className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 text-center text-xl font-bold text-slate-950">Secure Your Account</h2>
                  <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-slate-500">
                    Center your face in the circle, capture the scan, then submit it for recognition.
                  </p>
                  <div className="mt-5 space-y-2">
                    {["Device camera ready", "Face scan required", "AWS Rekognition comparison"].map((item) => (
                      <div key={item} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
