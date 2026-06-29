import React from "react";

export default function FaceScanGuide({
  videoRef,
  imageUrl,
  cameraActive = true,
  status = "Center your face inside the ring",
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  cancelLabel,
  onCancel,
  disabled = false,
  compact = false,
}) {
  const ringSize = compact ? "h-48 w-48" : "h-[200px] w-[200px]";

  return (
    <div className={compact ? "w-full" : "mx-auto w-full max-w-sm"}>
      <div
        className={`relative mx-auto ${ringSize} overflow-hidden rounded-full border-2 border-dashed border-primary bg-[repeating-linear-gradient(45deg,#eef1f3_0,#eef1f3_6px,#e4e8eb_6px,#e4e8eb_12px)]`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Face scan" className="h-full w-full object-cover" />
        ) : cameraActive ? (
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-center font-mono text-[11px] text-muted">
            live camera
            <br />
            feed
          </div>
        )}
      </div>

      {!compact && (
        <p className="mt-4 text-center text-[11px] font-medium text-label">{status}</p>
      )}

      {(primaryLabel || secondaryLabel || cancelLabel) && (
        <div className={`space-y-2.5 ${compact ? "mt-3" : "mt-5"}`}>
          {primaryLabel && (
            <button
              type="button"
              onClick={onPrimary}
              disabled={disabled}
              className="btn btn-primary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {primaryLabel}
            </button>
          )}
          {secondaryLabel && (
            <button
              type="button"
              onClick={onSecondary}
              disabled={disabled}
              className="w-full text-[10px] font-medium text-muted disabled:cursor-not-allowed disabled:opacity-55"
            >
              {secondaryLabel.includes("password") ? (
                <>
                  Use <span className="font-bold text-primary">password login</span> instead
                </>
              ) : (
                secondaryLabel
              )}
            </button>
          )}
          {cancelLabel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={disabled}
              className="btn btn-secondary w-full py-2 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
