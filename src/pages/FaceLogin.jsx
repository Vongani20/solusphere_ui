import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  FaceSmileIcon,
} from "@heroicons/react/24/outline";
import FaceScanGuide from "../components/FaceScanGuide";
import api, { getApiError, saveSession } from "../services/api";
import { getCameraErrorMessage, requestUserCamera } from "../utils/camera";

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
        stream = await requestUserCamera();
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        setError(getCameraErrorMessage(err));
      }
    }

    startWebcam();
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (capturedImage?.url) URL.revokeObjectURL(capturedImage.url);
    };
  }, [capturedImage]);

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
    <div className="flex min-h-screen items-center justify-center bg-[#070b13] p-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="mb-5 inline-flex items-center gap-2 font-semibold text-white hover:text-cyan-100">
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Login
        </Link>

        <div className="mb-5 flex items-center justify-center gap-3 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
            <FaceSmileIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Face Login</h1>
            <p className="text-sm text-white/55">Biometric sign-in</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-300/30 bg-rose-500/15 p-3 text-sm font-semibold text-white">
            {error}
          </div>
        )}

        <FaceScanGuide
          videoRef={videoRef}
          imageUrl={capturedImage?.url}
          cameraActive={!capturedImage}
          status={loading ? "Matching securely >>>" : "Scanning for match >>>"}
          primaryLabel={capturedImage ? (loading ? "Authenticating..." : "Use this face") : "Start scan"}
          onPrimary={capturedImage ? handleFaceLogin : captureFace}
          secondaryLabel="Try another way"
          onSecondary={capturedImage ? () => setCapturedImage(null) : () => navigate("/login")}
          cancelLabel="Cancel"
          onCancel={() => navigate("/login")}
          disabled={loading}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
