import React, { useState } from "react";
import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { HELPDESK_ACCEPT, HELPDESK_MAX_FILES, addHelpdeskFiles, formatFileSize } from "../utils/helpdeskAttachments";

export function HelpdeskAttachmentLinks({ attachments }) {
  if (!attachments?.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {attachments.map((file) => (
        <li key={file.id}>
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <PaperClipIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{file.file_name}</span>
            <span className="shrink-0 text-xs font-medium text-slate-400">{formatFileSize(file.size_bytes)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function HelpdeskAttachmentPicker({ files, onChange, disabled = false }) {
  const [error, setError] = useState("");

  const pick = (list) => {
    try {
      onChange(addHelpdeskFiles(files, list));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-slate-700">Attachments</span>
      <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
        <PaperClipIcon className="h-5 w-5" />
        Add files
        <input
          type="file"
          multiple
          accept={HELPDESK_ACCEPT}
          className="sr-only"
          disabled={disabled || files.length >= HELPDESK_MAX_FILES}
          onChange={(event) => {
            pick([...event.target.files]);
            event.target.value = "";
          }}
        />
      </label>
      <p className="mt-1 text-xs text-slate-500">Up to 5 files, 8 MB each. Images, PDF, Office, text, CSV, or ZIP.</p>
      {error ? <p className="mt-2 text-sm font-medium text-rose-700">{error}</p> : null}
      {files.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
              <span className="min-w-0 truncate text-slate-800">
                {file.name} <span className="text-slate-400">{formatFileSize(file.size)}</span>
              </span>
              <button
                type="button"
                className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(files.filter((_, item) => item !== index))}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
