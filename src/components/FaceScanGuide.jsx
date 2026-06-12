import React from "react";
import {
  CheckCircleIcon,
  FaceSmileIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

const steps = [
  {
    title: "Center Your Face",
    text: "Hold the device at eye level and keep your face inside the circle.",
  },
  {
    title: "Move Head Slowly",
    text: "Turn slightly so the system can capture more angles.",
  },
  {
    title: "Blink Eyes",
    text: "Blink naturally to help confirm a live scan.",
  },
  {
    title: "Complete Scan",
    text: "Keep still while the face profile is checked.",
  },
];

export default function FaceScanGuide({
  videoRef,
  imageUrl,
  cameraActive = true,
  title = "Account Security",
  description = "Position your face in the frame to continue.",
  status = "ready",
  compact = false,
}) {
  const activeStep = imageUrl ? 3 : cameraActive ? 0 : -1;
  const progress = imageUrl ? 330 : cameraActive ? 92 : 0;
  const statusLabel = imageUrl ? "Face captured" : cameraActive ? "Center your face" : "Camera closed";

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 p-4 text-white shadow-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10">
            <LockClosedIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-normal text-white">{title}</h2>
            <p className="text-xs text-white/55">{description}</p>
          </div>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10">
          <FaceSmileIcon className="h-5 w-5" />
        </span>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
        <div className="relative aspect-[4/3]">
          {imageUrl ? (
            <img src={imageUrl} alt="Captured face" className="h-full w-full object-cover" />
          ) : cameraActive ? (
            <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/45">
              Camera closed
            </div>
          )}

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_34%,rgba(0,0,0,0.58)_35%,rgba(0,0,0,0.72)_100%)]" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-52 w-52 max-w-[72%] sm:h-60 sm:w-60">
              <div
                className="absolute -inset-2 rounded-full"
                style={{
                  background: `conic-gradient(#22c55e ${progress}deg, rgba(255,255,255,0.92) ${progress}deg 360deg)`,
                  WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px))",
                  mask: "radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px))",
                }}
              />
              <div className="absolute inset-0 rounded-full border-2 border-white/80 shadow-[0_0_28px_rgba(255,255,255,0.2)]" />
              <div className="absolute inset-6 rounded-full border border-white/15" />
              <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
            </div>
          </div>

          <div className="absolute inset-x-4 bottom-4 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-center text-xs font-semibold text-white backdrop-blur">
            {statusLabel}
          </div>
        </div>
      </div>

      <div className={`mt-4 grid gap-2 ${compact ? "sm:grid-cols-2" : ""}`}>
        {steps.map((step, index) => {
          const complete = imageUrl || index < activeStep;
          const current = index === activeStep && !imageUrl;
          return (
            <div
              key={step.title}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                current
                  ? "border-emerald-400/60 bg-emerald-400/15"
                  : complete
                    ? "border-cyan-300/40 bg-cyan-400/10"
                    : "border-white/10 bg-white/5"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  complete
                    ? "bg-emerald-500 text-white"
                    : current
                      ? "bg-cyan-400 text-slate-950"
                      : "bg-white/10 text-white/70"
                }`}
              >
                {complete ? <CheckCircleIcon className="h-4 w-4" /> : index + 1}
              </span>
              <span>
                <span className="block text-sm font-bold text-white">{step.title}</span>
                {!compact && <span className="mt-1 block text-xs leading-5 text-white/55">{step.text}</span>}
              </span>
            </div>
          );
        })}
      </div>

      {status !== "ready" && <p className="mt-3 text-xs font-semibold text-white/60">{status}</p>}
    </div>
  );
}
