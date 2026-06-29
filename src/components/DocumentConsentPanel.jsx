import React from "react";
import { CheckCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { AI_DOCUMENT_CONSENT_TYPE } from "../hooks/useDocumentProcessingConsent";
import { formatDate } from "../utils/formatters";

export function getDocumentConsentRecord(consents) {
  if (!Array.isArray(consents)) return null;
  return consents.find((item) => item.consent_type === AI_DOCUMENT_CONSENT_TYPE && item.signed) || null;
}

export default function DocumentConsentPanel({
  loading = false,
  hasConsent = false,
  consents = [],
  onSignClick,
  title = "Document processing consent required",
  description = "Sign consent before saving your CV, uploading a profile photo, or importing a PDF for AI pre-fill.",
}) {
  const record = getDocumentConsentRecord(consents);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  if (hasConsent && record) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-900">Consent signed</p>
            <p className="mt-1 text-xs text-emerald-800">
              Signed by <span className="font-semibold">{record.signed_name}</span>
              {record.accepted_at ? ` on ${formatDate(record.accepted_at)}` : ""}.
            </p>
            <p className="mt-2 text-[11px] text-emerald-700">
              You may now save your CV, import a PDF, and upload a profile photo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-bold text-amber-950">{title}</p>
            <p className="mt-1 text-xs leading-5 text-amber-900">{description}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-800">
              <li>Storing your CV profile and making it available for talent search (when saved)</li>
              <li>AI-assisted extraction when you import a CV PDF</li>
              <li>Processing profile photos you upload for your CV</li>
            </ul>
          </div>
        </div>
        <button
          type="button"
          onClick={onSignClick}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
        >
          Review &amp; sign consent
        </button>
      </div>
    </div>
  );
}
