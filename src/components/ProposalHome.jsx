import React, { useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  CloudArrowUpIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { LeafIcon } from "./BirthdayBoard";
import DimensionalIcon from "./DimensionalIcon";
import { formatDate } from "../utils/formatters";

export const PROPOSAL_ACCEPT =
  ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

const STATUS_STYLES = {
  processing: "bg-amber-50 text-amber-800 border-amber-200",
  ready: "bg-emerald-50 text-emerald-800 border-emerald-200",
  review: "bg-sky-50 text-sky-800 border-sky-200",
  failed: "bg-rose-50 text-rose-800 border-rose-200",
};

const STATUS_LABELS = {
  processing: "Building…",
  ready: "Ready",
  review: "Needs review",
  failed: "Failed",
};

const STEPS = [
  { n: 1, title: "Upload the tender", text: "PDF, Word or text, up to 12 files." },
  { n: 2, title: "Review on screen", text: "Edit the proposal and confirm open items." },
  { n: 3, title: "Download when ready", text: "Get a Word file only when you submit." },
];

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Turns a closing date such as "2026-04-06 12:00" into a friendly countdown chip.
function closingChip(closingDate) {
  if (!closingDate) return null;
  const parsed = new Date(String(closingDate).replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) {
    return { text: `Closes ${closingDate}`, tone: "border-slate-200 bg-slate-50 text-slate-600" };
  }
  const days = Math.ceil((parsed.getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: "Closed", tone: "border-slate-200 bg-slate-100 text-slate-500" };
  if (days === 0) return { text: "Closes today", tone: "border-rose-200 bg-rose-50 text-rose-700" };
  if (days <= 7) {
    return { text: `Closes in ${days} day${days === 1 ? "" : "s"}`, tone: "border-amber-200 bg-amber-50 text-amber-800" };
  }
  return {
    text: `Closes ${parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
}

function StatusChip({ status }) {
  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.review}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

/**
 * Landing view of the Tender Proposal module: a roomy drop zone, a short paperless
 * "how it works", and searchable saved proposals.
 */
export default function ProposalHome({
  aiConfigured,
  files,
  setFiles,
  uploading,
  onBuild,
  documents,
  loading,
  onRefresh,
  onOpen,
  onDelete,
  fileInputRef,
}) {
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");

  const addFiles = (list) => {
    const incoming = [...(list || [])].filter((f) => /\.(pdf|docx|txt|md)$/i.test(f.name));
    setFiles((current) => {
      const seen = new Set(current.map((f) => `${f.name}:${f.size}`));
      return [...current, ...incoming.filter((f) => !seen.has(`${f.name}:${f.size}`))].slice(0, 12);
    });
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter((d) =>
      [d.title, d.issuer, d.referenceNumber, d.originalFilename].some((v) => v?.toLowerCase().includes(needle))
    );
  }, [documents, query]);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const buildLabel = uploading
    ? "Uploading…"
    : files.length
      ? `Build proposal from ${files.length} file${files.length === 1 ? "" : "s"}`
      : "Build proposal";

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden !p-0">
        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="min-w-0 p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <DimensionalIcon icon={ClipboardDocumentListIcon} tone="forest" size="lg" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-950">Tender Proposal</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Upload a tender and get a proposal that answers each requirement. Review it on screen; no printing needed.
                </p>
              </div>
            </div>

            {!aiConfigured && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                AI is not configured on the server, so proposals use the built-in reader.
              </p>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                onBuild();
              }}
              className="mt-5 space-y-4"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={PROPOSAL_ACCEPT}
                className="hidden"
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`well-3d flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
                  dragging
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-emerald-200 bg-[#f6faf7] hover:border-emerald-400 hover:bg-emerald-50"
                }`}
              >
                <CloudArrowUpIcon className="h-9 w-9 text-emerald-600" />
                <span className="text-sm font-bold text-slate-800">
                  Drop tender documents here or <span className="text-emerald-700 underline">browse</span>
                </span>
                <span className="text-xs text-slate-500">PDF, Word (.docx) or text · up to 12 files · 15 MB each</span>
              </button>

              {files.length > 0 && (
                <div className="space-y-2">
                  <ul className="flex flex-wrap gap-2">
                    {files.map((file) => (
                      <li
                        key={`${file.name}:${file.size}`}
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1 text-xs text-slate-700"
                      >
                        <DocumentTextIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span className="truncate font-medium" title={file.name}>
                          {file.name}
                        </span>
                        <span className="shrink-0 text-slate-400">{formatBytes(file.size)}</span>
                        <button
                          type="button"
                          onClick={() => setFiles((current) => current.filter((f) => f !== file))}
                          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                          aria-label={`Remove ${file.name}`}
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-500">
                    {files.length} file{files.length === 1 ? "" : "s"} · {formatBytes(totalSize)}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={!files.length || uploading}
                className="btn btn-primary inline-flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {uploading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <DocumentArrowUpIcon className="h-5 w-5" />}
                {buildLabel}
              </button>
            </form>
          </div>

          <aside className="min-w-0 border-t border-emerald-100 bg-[#f3f8f4] p-5 sm:p-7 lg:border-l lg:border-t-0">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-800">
              <LeafIcon className="h-4 w-4" /> Paperless by design
            </p>
            <ol className="mt-4 space-y-4">
              {STEPS.map((step) => (
                <li key={step.n} className="flex gap-3">
                  <span className="icon-orb icon-orb-forest h-8 w-8 text-sm font-bold">
                    {step.n}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">{step.title}</p>
                    <p className="text-xs text-slate-600">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 rounded-xl bg-white/70 p-3 text-xs text-slate-600 ring-1 ring-emerald-100">
              Drafts stay in SoluSphere, so the team reviews one version on screen instead of printing copies.
            </p>
          </aside>
        </div>
      </section>

      <section className="card">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-950">Saved proposals</h2>
            <p className="text-sm text-slate-500">
              {documents.length} saved{documents.length ? " · open one to review and edit" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="relative block flex-1 sm:w-64">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search proposals" className="input pl-9" />
            </label>
            <button type="button" onClick={onRefresh} className="btn btn-secondary px-3" aria-label="Refresh proposals">
              <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <ClipboardDocumentListIcon className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {loading ? "Loading proposals…" : documents.length ? "No proposals match your search" : "No proposals yet"}
            </p>
            {!loading && !documents.length ? (
              <p className="mt-1 text-sm text-slate-500">Upload a tender above to draft your first one.</p>
            ) : null}
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {visible.map((doc) => {
              const closing = closingChip(doc.closingDate);
              return (
                <li
                  key={doc.id}
                  className="lift-3d relative min-w-0 rounded-2xl border border-slate-200 bg-white p-4 hover:border-emerald-300"
                >
                  <button type="button" onClick={() => onOpen(doc.id)} className="block w-full min-w-0 pr-8 text-left">
                    <p className="line-clamp-2 text-sm font-bold text-slate-950" title={doc.title}>
                      {doc.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {[doc.issuer, doc.referenceNumber].filter(Boolean).join(" · ") || doc.originalFilename}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <StatusChip status={doc.status} />
                      {closing ? (
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${closing.tone}`}>{closing.text}</span>
                      ) : null}
                      {doc.gapCount ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          {doc.gapCount} to confirm
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      Updated {formatDate(doc.updatedAt)} · {doc.sourceCount} file{doc.sourceCount === 1 ? "" : "s"}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(doc.id)}
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                    aria-label={`Delete ${doc.title}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
