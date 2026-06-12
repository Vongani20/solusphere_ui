import React from "react";

export default function FaceScanGuide({
  videoRef,
  imageUrl,
  cameraActive = true,
  status = "Scanning for match >>>",
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  cancelLabel,
  onCancel,
  disabled = false,
  compact = false,
}) {
  const displayStatus = imageUrl ? "Face captured" : cameraActive ? "Center your face" : "Camera closed";
  const displaySubtext = status || (imageUrl ? "Ready for secure match >>>" : "Scanning for match >>>");
  const frameHeight = compact ? "h-72 sm:h-80" : "h-80 sm:h-[25rem]";
  const frameWidth = compact ? "w-56 sm:w-64" : "w-64 sm:w-72";

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border border-slate-800 bg-[#11151f] p-5 text-white shadow-2xl">
      <div className="rounded-[1.6rem] bg-gradient-to-b from-[#171b26] to-[#0d111a] px-4 pb-6 pt-5">
        <div className="relative mx-auto flex justify-center">
          <div className={`relative ${frameHeight} ${frameWidth}`}>
            <div className="absolute -inset-3 rounded-full bg-violet-500/25 blur-xl" />
            <div className="absolute -inset-2 rounded-full bg-gradient-to-b from-white/55 via-violet-400 to-slate-700 p-[4px] shadow-[0_0_32px_rgba(139,92,246,0.45)]">
              <div className="relative h-full w-full overflow-hidden rounded-full bg-slate-950">
                {imageUrl ? (
                  <img src={imageUrl} alt="Face scan" className="h-full w-full object-cover" />
                ) : cameraActive ? (
                  <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-950 text-sm font-semibold text-white/45">
                    Camera closed
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0,transparent_58%,rgba(15,23,42,0.18)_72%,rgba(15,23,42,0.55)_100%)]" />
              </div>
            </div>

            <div className="pointer-events-none absolute inset-4 rounded-full border-2 border-dashed border-white/45" />
            <div className="pointer-events-none absolute -inset-2 rounded-full border border-violet-300/75" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-8 w-28 -translate-x-1/2 rounded-full bg-white/35 blur-md" />
          </div>
        </div>

        <div className="mt-8 text-center">
          <h2 className="text-2xl font-extrabold leading-tight tracking-normal text-white">{displayStatus}</h2>
          <p className="mt-2 text-sm font-semibold text-white/45">{displaySubtext}</p>
        </div>

        {(primaryLabel || secondaryLabel || cancelLabel) && (
          <div className="mt-8 space-y-3">
            {primaryLabel && (
              <button
                type="button"
                onClick={onPrimary}
                disabled={disabled}
                className="w-full rounded-lg bg-gradient-to-b from-violet-400 to-violet-600 px-5 py-3 text-sm font-extrabold text-white shadow-[0_10px_28px_rgba(124,58,237,0.35)] transition hover:from-violet-300 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {primaryLabel}
              </button>
            )}
            {secondaryLabel && (
              <button
                type="button"
                onClick={onSecondary}
                disabled={disabled}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {secondaryLabel}
              </button>
            )}
            {cancelLabel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={disabled}
                className="w-full rounded-lg px-5 py-2 text-sm font-bold text-white/55 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                {cancelLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
