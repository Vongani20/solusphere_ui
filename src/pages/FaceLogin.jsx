import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FaceScanGuide from "../components/FaceScanGuide";
import AuthLayout, { AuthAlert } from "../components/AuthLayout";
import api, { clearSession, getApiError, saveSession } from "../services/api";
import { getCameraErrorMessage, requestUserCamera } from "../utils/camera";

export default function FaceLogin() {
  const [capturedImage, setCapturedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    clearSession();
  }, []);

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
    }, "image/jpeg", 0.92);
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
      const res = await api.post("/auth/face-login", formData);
      saveSession({ token: res.data.token, user: res.data.user });
      navigate("/dashboard");
    } catch (err) {
      setError(getApiError(err, "Face not recognized."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      heroTitle="Face Login"
      heroSubtitle="Biometric sign-in via webcam"
      backLink={{ to: "/login", label: "← Back to Login" }}
    >
      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <FaceScanGuide
        videoRef={videoRef}
        imageUrl={capturedImage?.url}
        cameraActive={!capturedImage}
        status="Center your face inside the ring"
        primaryLabel={capturedImage ? (loading ? "Authenticating..." : "Use this face") : "Start Face Scan"}
        onPrimary={capturedImage ? handleFaceLogin : captureFace}
        secondaryLabel="password login"
        onSecondary={capturedImage ? () => setCapturedImage(null) : () => navigate("/login")}
        disabled={loading}
      />
      <canvas ref={canvasRef} className="hidden" />
    </AuthLayout>
  );
}
