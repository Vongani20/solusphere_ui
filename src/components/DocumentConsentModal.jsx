import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

const CONSENT_TEXT = `By signing below, I confirm that:

1. I consent to Solusphere processing documents I upload (including CVs and business PDFs) using automated and AI-assisted tools.
2. I understand that document text may be sent to third-party AI providers (such as OpenAI) solely to extract, analyse, and structure information for my use within Solusphere.
3. I confirm that I have the legal right to upload the document and that it does not contain unlawful or unauthorised personal data of others without their permission.
4. I understand that I should review all AI-generated results before saving, sharing, or relying on them.
5. I may withdraw this consent by contacting support; previously processed records may be retained as required by law or platform policy.`;

export default function DocumentConsentModal({
  open,
  onClose,
  onSigned,
  signing = false,
  error = "",
}) {
  const [accepted, setAccepted] = useState(false);
  const [signedName, setSignedName] = useState("");

  if (!open) return null;

  const canSubmit = accepted && signedName.trim().length >= 2 && !signing;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    const ok = await onSigned(signedName.trim());
    if (ok) {
      setAccepted(false);
      setSignedName("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50"
        aria-label="Close consent dialog"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Document Processing Consent</h2>
            <p className="mt-1 text-sm text-slate-500">
              Required before uploading CVs or PDFs for AI analysis
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
            {CONSENT_TEXT}
          </div>

          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span>I have read and agree to the document processing consent terms above.</span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Full name (electronic signature)</span>
            <input
              type="text"
              value={signedName}
              onChange={(event) => setSignedName(event.target.value)}
              placeholder="Type your full legal name"
              className="input w-full"
              autoComplete="name"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={!canSubmit} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50">
              {signing ? "Signing..." : "Sign consent and continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
