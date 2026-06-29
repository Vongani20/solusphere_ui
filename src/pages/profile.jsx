import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  CameraIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  KeyIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import FaceScanGuide from "../components/FaceScanGuide";
import UserAvatar from "../components/UserAvatar";
import useFaceFollowCamera from "../hooks/useFaceFollowCamera";
import api, { getApiError, saveSession } from "../services/api";
import { getCameraErrorMessage, requestUserCamera } from "../utils/camera";
import { canvasToJpegBlob, captureFollowedFace } from "../utils/faceCapture";
import { formatDate, titleize } from "../utils/formatters";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const trackingEnabled = cameraOpen && !capturedImage;
  const { transform, tracking } = useFaceFollowCamera(videoRef, trackingEnabled);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/profile");
      setUser(res.data.user);
      saveSession({ user: res.data.user });
      if (!res.data.user?.face_status) {
        setCameraOpen(true);
      }
    } catch (err) {
      setError(getApiError(err, "Failed to load profile."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!cameraOpen) return undefined;

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
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      if (capturedImage?.url) URL.revokeObjectURL(capturedImage.url);
    };
  }, [capturedImage]);

  const captureFace = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Camera is not ready yet.");
      return;
    }

    const canvas = captureFollowedFace(video, transform) || canvasRef.current;
    if (!canvas) {
      setError("Failed to capture image.");
      return;
    }

    const blob = await canvasToJpegBlob(canvas);
    if (!blob) {
      setError("Failed to capture image.");
      return;
    }

    if (capturedImage?.url) URL.revokeObjectURL(capturedImage.url);
    setCapturedImage({ blob, url: URL.createObjectURL(blob) });
    setError("");
  };

  const submitFace = async () => {
    if (!capturedImage) {
      setError("Capture a face image first.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.append("face", capturedImage.blob, "face.jpg");

    try {
      const request = user?.face_status
        ? api.put("/face/update", formData)
        : api.post("/face/register", formData);
      const res = await request;
      setMessage(res.data.message || "Face profile saved.");
      setCapturedImage(null);
      setCameraOpen(false);
      await fetchProfile();
    } catch (err) {
      setError(getApiError(err, "Face profile could not be saved."));
    } finally {
      setUploading(false);
    }
  };

  const deleteFace = async () => {
    setDeleting(true);
    setError("");
    setMessage("");

    try {
      const res = await api.delete("/face/delete");
      setMessage(res.data.message || "Face profile deleted.");
      setCapturedImage(null);
      setCameraOpen(true);
      await fetchProfile();
    } catch (err) {
      setError(getApiError(err, "Failed to delete face profile."));
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !user) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-b-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="card">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-5">
              <UserAvatar user={user} className="h-24 w-24" iconClassName="h-16 w-16" />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold text-slate-950">{user?.username || "Profile"}</h1>
                <p className="truncate text-slate-500">{user?.email || "Email unavailable"}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusPill active={user?.face_status} />
                  <span className="status-pill-neutral">{titleize(user?.role)}</span>
                </div>
              </div>
            </div>
            <button type="button" onClick={fetchProfile} className="btn btn-secondary inline-flex items-center gap-2">
              <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </section>

        {(message || error) && (
          <div
            className={`rounded-lg border p-4 text-sm font-semibold ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || message}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
          <div className="card">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Face Profile</h2>
                <p className="text-sm text-slate-500">
                  {user?.face_status ? "Registered biometric profile" : "Registration required"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCameraOpen((value) => !value)}
                  className="btn btn-secondary inline-flex items-center gap-2"
                >
                  <CameraIcon className="h-5 w-5" />
                  {cameraOpen ? "Close Camera" : "Open Camera"}
                </button>
                {user?.face_status && (
                  <button
                    type="button"
                    onClick={deleteFace}
                    disabled={deleting}
                    className="rounded-lg p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                    aria-label="Delete face profile"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <FaceScanGuide
                  videoRef={videoRef}
                  cameraActive={cameraOpen}
                  videoTransform={transform}
                  title={user?.face_status ? "Update Face ID" : "Register Your Face"}
                  description="Track your face inside the circle before saving."
                  status={cameraOpen ? tracking.message : "Open the camera to begin."}
                  compact
                />
                <canvas ref={canvasRef} className="hidden" />
                <button
                  type="button"
                  onClick={captureFace}
                  disabled={!cameraOpen || uploading}
                  className="btn btn-secondary mt-4 inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CameraIcon className="h-5 w-5" />
                  Capture
                </button>
              </div>

              <div>
                {capturedImage ? (
                  <>
                    <FaceScanGuide
                      imageUrl={capturedImage.url}
                      cameraActive={false}
                      title="Face Scan Ready"
                      description="Save this scan to complete biometric setup."
                      status="Ready for AWS Rekognition indexing."
                      compact
                    />
                    <button
                      type="button"
                      onClick={submitFace}
                      disabled={uploading}
                      className="btn btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CloudArrowUpIcon className="h-5 w-5" />
                      {uploading ? "Saving..." : user?.face_status ? "Update Face" : "Register Face"}
                    </button>
                  </>
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border-muted bg-[#f3f5f7] p-6 text-center font-mono text-[9px] text-muted">
                    captured
                    <br />
                    preview
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <InfoPanel
              icon={ShieldCheckIcon}
              label="Security Level"
              value={user?.face_status ? "High" : "Standard"}
              detail={user?.face_status ? "Password and face login" : "Password login only"}
            />
            <InfoPanel
              icon={UserCircleIcon}
              label="User ID"
              value={user?.id || "Not available"}
              detail={user?.created_at ? `Created ${formatDate(user.created_at)}` : "Account record"}
            />
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
                  <KeyIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-500">Password</p>
                  <p className="truncate text-xl font-bold text-slate-950">Account Security</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Update your password or use the forgot-password SNS reset flow from sign in.
              </p>
              <Link to="/update-password" className="btn btn-primary mt-4 inline-flex w-full items-center justify-center gap-2">
                <KeyIcon className="h-5 w-5" />
                Update Password
              </Link>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function StatusPill({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 face-badge">
      <CheckCircleIcon className="h-3 w-3" />
      Face verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b07d20]/30 bg-[#fff4e0] px-2.5 py-0.5 text-[8px] font-bold text-[#b07d20]">
      <XCircleIcon className="h-3 w-3" />
      Face pending
    </span>
  );
}

function InfoPanel({ icon: Icon, label, value, detail }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-heading text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="truncate text-xl font-bold text-slate-950">{value}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">{detail}</p>
    </div>
  );
}
