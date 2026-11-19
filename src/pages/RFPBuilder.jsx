import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  DocumentArrowUpIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import DocumentConsentModal from "../components/DocumentConsentModal";
import api, { getApiError } from "../services/api";
import { useDocumentProcessingConsent } from "../hooks/useDocumentProcessingConsent";
import { formatDate } from "../utils/formatters";

const ACCEPT =
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

const emptySolution = { summary: "", approach: [], whyItFits: [], team: [], risks: [] };

export default function RFPBuilder() {
  const [documents, setDocuments] = useState([]);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState("");
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [consentOpen, setConsentOpen] = useState(false);
  const pendingActionRef = useRef(null);
  const fileInputRef = useRef(null);
  const {
    hasConsent,
    signConsent,
    signing: consentSigning,
    error: consentError,
  } = useDocumentProcessingConsent();

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/rfp/documents");
      setDocuments(res.data.documents || []);
      setAiConfigured(res.data.aiConfigured !== false);
    } catch (err) {
      setError(getApiError(err, "Failed to load RFP templates."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Poll while the selected template is still being built.
  useEffect(() => {
    if (selected?.status !== "processing") return undefined;
    const timer = window.setInterval(async () => {
      try {
        const res = await api.get(`/rfp/documents/${selected.id}`);
        if (res.data.status !== "processing") {
          setSelected(res.data);
          setDirty(false);
          setMessage(res.data.source === "ai" ? "Template built with AI." : "Template built with the built-in reader.");
          loadDocuments();
        }
      } catch {
        window.clearInterval(timer);
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [selected?.id, selected?.status, loadDocuments]);

  const withConsent = async (action) => {
    if (hasConsent) return action();
    pendingActionRef.current = action;
    setConsentOpen(true);
    return undefined;
  };

  const handleConsentSigned = async (signedName) => {
    const ok = await signConsent(signedName);
    if (!ok) return false;
    setConsentOpen(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) await action();
    return true;
  };

  const resetFeedback = () => {
    setError("");
    setMessage("");
  };

  const createTemplate = async () => {
    if (!files.length) return;
    setUploading(true);
    resetFeedback();
    const body = new FormData();
    files.forEach((file) => body.append("files", file));
    try {
      const res = await api.post("/rfp/documents", body, { timeout: 180000 });
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelected(res.data);
      setDirty(false);
      setMessage("Documents uploaded. Building the template…");
      loadDocuments();
    } catch (err) {
      setError(getApiError(err, "Failed to upload documents."));
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (id) => {
    resetFeedback();
    try {
      const res = await api.get(`/rfp/documents/${id}`);
      setSelected(res.data);
      setDirty(false);
    } catch (err) {
      setError(getApiError(err, "Failed to open template."));
    }
  };

  const deleteDocument = async (id) => {
    if (!window.confirm("Delete this RFP template? This cannot be undone.")) return;
    resetFeedback();
    try {
      await api.delete(`/rfp/documents/${id}`);
      if (selected?.id === id) setSelected(null);
      setMessage("Template deleted.");
      loadDocuments();
    } catch (err) {
      setError(getApiError(err, "Failed to delete template."));
    }
  };

  const save = async () => {
    const res = await api.put(`/rfp/documents/${selected.id}`, { template: selected.template });
    setSelected(res.data);
    setDirty(false);
    loadDocuments();
    return res.data;
  };

  const onSave = async () => {
    setBusy("save");
    resetFeedback();
    try {
      await save();
      setMessage("Changes saved.");
    } catch (err) {
      setError(getApiError(err, "Failed to save changes."));
    } finally {
      setBusy("");
    }
  };

  const onDownload = async () => {
    setBusy("download");
    resetFeedback();
    try {
      if (dirty) await save();
      const res = await api.get(`/rfp/documents/${selected.id}/download`, { responseType: "blob" });
      const disposition = res.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = match?.[1] || "rfp-template.docx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Word file downloaded.");
    } catch (err) {
      setError(getApiError(err, "Failed to download the Word file."));
    } finally {
      setBusy("");
    }
  };

  const onRebuild = async () => {
    if (dirty && !window.confirm("Rebuilding replaces your unsaved edits. Continue?")) return;
    setBusy("rebuild");
    resetFeedback();
    try {
      const res = await api.post(`/rfp/documents/${selected.id}/reanalyze`);
      setSelected(res.data);
      setDirty(false);
      setMessage("Rebuilding the template…");
    } catch (err) {
      setError(getApiError(err, "Failed to rebuild the template."));
    } finally {
      setBusy("");
    }
  };

  const onAddDocuments = (list) => {
    const incoming = [...(list || [])];
    if (!incoming.length) return;
    withConsent(async () => {
      setBusy("add");
      resetFeedback();
      const body = new FormData();
      incoming.forEach((file) => body.append("files", file));
      try {
        const res = await api.post(`/rfp/documents/${selected.id}/sources`, body, { timeout: 180000 });
        setSelected(res.data);
        setDirty(false);
        setMessage("Documents added. Rebuilding the template…");
      } catch (err) {
        setError(getApiError(err, "Failed to add documents."));
      } finally {
        setBusy("");
      }
    });
  };

  const patch = (partial) => {
    setSelected((current) => ({ ...current, template: { ...current.template, ...partial } }));
    setDirty(true);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {error && <Alert tone="error" text={error} />}
        {message && <Alert tone="success" text={message} />}

        {selected ? (
          <Editor
            doc={selected}
            busy={busy}
            dirty={dirty}
            patch={patch}
            onBack={() => {
              if (dirty && !window.confirm("Leave without saving your changes?")) return;
              setSelected(null);
              setDirty(false);
              resetFeedback();
            }}
            onSave={onSave}
            onDownload={onDownload}
            onRebuild={onRebuild}
            onAddDocuments={onAddDocuments}
          />
        ) : (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="card">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
                  <ClipboardDocumentListIcon className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-950">RFP Builder</h1>
                  <p className="text-sm text-slate-500">
                    Upload a tender or RFP and get an editable RFP template with a solution idea.
                  </p>
                </div>
              </div>

              {!aiConfigured && (
                <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  AI is not configured on the server, so templates use the built-in reader.
                </p>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  withConsent(createTemplate);
                }}
                className="space-y-4"
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Tender documents (PDF, Word or text, up to 12 files, 15 MB each)
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPT}
                    onChange={(event) => setFiles([...(event.target.files || [])])}
                    className="block w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
                  />
                </label>

                {files.length > 0 && (
                  <ul className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {files.map((file) => (
                      <li key={file.name} className="truncate">
                        {file.name}
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="submit"
                  disabled={!files.length || uploading}
                  className="btn btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <DocumentArrowUpIcon className="h-5 w-5" />
                  {uploading ? "Uploading…" : "Build RFP template"}
                </button>
              </form>
            </div>

            <div className="card">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Your templates</h2>
                  <p className="text-sm text-slate-500">{documents.length} saved</p>
                </div>
                <button type="button" onClick={loadDocuments} className="btn btn-secondary inline-flex items-center gap-2">
                  <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {documents.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  {loading ? "Loading templates…" : "No templates yet. Upload a tender to start."}
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-3 bg-white px-4 py-3 hover:bg-slate-50">
                      <button type="button" onClick={() => openDocument(doc.id)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-semibold text-slate-950">{doc.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          {[doc.issuer, doc.referenceNumber, doc.closingDate && `Closes ${doc.closingDate}`]
                            .filter(Boolean)
                            .join(" · ") || doc.originalFilename}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(doc.updatedAt)} · {doc.sourceCount} file{doc.sourceCount === 1 ? "" : "s"}
                          {doc.gapCount ? ` · ${doc.gapCount} to confirm` : ""}
                        </p>
                      </button>
                      <StatusBadge status={doc.status} />
                      <button
                        type="button"
                        onClick={() => deleteDocument(doc.id)}
                        className="rounded-lg p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                        aria-label={`Delete ${doc.title}`}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>

      <DocumentConsentModal
        open={consentOpen}
        onClose={() => {
          setConsentOpen(false);
          pendingActionRef.current = null;
        }}
        onSigned={handleConsentSigned}
        signing={consentSigning}
        error={consentError}
      />
    </DashboardLayout>
  );
}

function Editor({ doc, busy, dirty, patch, onBack, onSave, onDownload, onRebuild, onAddDocuments }) {
  const t = doc.template || {};
  const solution = t.solution || emptySolution;
  const processing = doc.status === "processing";
  const disabled = Boolean(busy) || processing;
  const patchSolution = (partial) => patch({ solution: { ...solution, ...partial } });
  const sourceNames = (doc.sources?.length ? doc.sources : [{ name: doc.originalFilename }])
    .map((item) => item.name)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div className="card">
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">
          <ArrowLeftIcon className="h-4 w-4" /> All templates
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-bold text-slate-950">{t.title || "Untitled RFP"}</h1>
              <StatusBadge status={doc.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {sourceNames}
              {!processing && (doc.source === "ai" ? ` · drafted by ${doc.model || "AI"}` : " · drafted by the built-in reader")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className={`btn btn-secondary inline-flex cursor-pointer items-center gap-2 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
              <PlusIcon className="h-5 w-5" />
              {busy === "add" ? "Adding…" : "Add documents"}
              <input
                type="file"
                multiple
                hidden
                accept={ACCEPT}
                disabled={disabled}
                onChange={(event) => {
                  onAddDocuments(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
            <button type="button" onClick={onRebuild} disabled={disabled} className="btn btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
              <ArrowPathIcon className={`h-5 w-5 ${busy === "rebuild" ? "animate-spin" : ""}`} /> Rebuild
            </button>
            <button type="button" onClick={onSave} disabled={disabled || !dirty} className="btn btn-secondary disabled:opacity-50">
              {busy === "save" ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={onDownload} disabled={disabled} className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-50">
              <ArrowDownTrayIcon className="h-5 w-5" />
              {busy === "download" ? "Preparing…" : "Download Word"}
            </button>
          </div>
        </div>
        {doc.warning && !processing && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{doc.warning}</p>
        )}
      </div>

      {processing ? (
        <div className="card flex items-center gap-3 text-sm text-slate-600">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-primary" />
          Reading the tender and building the template. Long tenders can take a few minutes; this page updates on its own.
        </div>
      ) : (
        <>
          <Section title="Solution idea" hint="A practical way to answer this RFP, based on its scope and how bids are scored." accent>
            <Area label="Idea" value={solution.summary} onChange={(summary) => patchSolution({ summary })} />
            <StringList label="How to deliver it" items={solution.approach} onChange={(approach) => patchSolution({ approach })} />
            <StringList label="Why this fits the evaluation" items={solution.whyItFits} onChange={(whyItFits) => patchSolution({ whyItFits })} />
            <StringList label="Team to put forward" items={solution.team} onChange={(team) => patchSolution({ team })} />
            <PairList
              label="Risks to handle"
              items={solution.risks}
              leftKey="risk"
              rightKey="response"
              leftPlaceholder="Risk"
              rightPlaceholder="How to handle it"
              onChange={(risks) => patchSolution({ risks })}
            />
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <Section title="Overview">
                <Field label="Title" value={t.title} onChange={(title) => patch({ title })} />
                <Field label="Reference" value={t.referenceNumber} onChange={(referenceNumber) => patch({ referenceNumber })} />
                <Field label="Issued by" value={t.issuer} onChange={(issuer) => patch({ issuer })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Issue date" value={t.issueDate} onChange={(issueDate) => patch({ issueDate })} />
                  <Field label="Closing" value={t.closingDate} onChange={(closingDate) => patch({ closingDate })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Contact name" value={t.contactName} onChange={(contactName) => patch({ contactName })} />
                  <Field label="Contact email" value={t.contactEmail} onChange={(contactEmail) => patch({ contactEmail })} />
                </div>
                <Area label="Summary" value={t.summary} onChange={(summary) => patch({ summary })} />
              </Section>

              <Section title="Background and objectives">
                <Area label="Background" value={t.background} onChange={(background) => patch({ background })} />
                <StringList label="Objectives" items={t.objectives} onChange={(objectives) => patch({ objectives })} />
              </Section>

              <Section title="Scope and deliverables">
                <StringList label="Scope of work" items={t.scope} onChange={(scope) => patch({ scope })} />
                <StringList label="Deliverables" items={t.deliverables} onChange={(deliverables) => patch({ deliverables })} />
              </Section>

              <Section title="Requirements">
                {(t.requirements || []).map((group, index) => (
                  <div key={index} className="space-y-3 rounded-lg border border-slate-200 p-3">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Field
                          label="Category"
                          value={group.category}
                          onChange={(category) =>
                            patch({ requirements: t.requirements.map((item, i) => (i === index ? { ...item, category } : item)) })
                          }
                        />
                      </div>
                      <RemoveButton onClick={() => patch({ requirements: t.requirements.filter((_, i) => i !== index) })} />
                    </div>
                    <StringList
                      label="Items"
                      items={group.items}
                      onChange={(items) =>
                        patch({ requirements: t.requirements.map((item, i) => (i === index ? { ...item, items } : item)) })
                      }
                    />
                  </div>
                ))}
                <AddButton
                  label="Add requirement group"
                  onClick={() => patch({ requirements: [...(t.requirements || []), { category: "Additional", items: [""] }] })}
                />
              </Section>
            </div>

            <div className="space-y-6">
              <Section title="Eligibility">
                <StringList items={t.eligibility} onChange={(eligibility) => patch({ eligibility })} placeholder="Who may bid" />
              </Section>
              <Section title="Evaluation">
                <PairList
                  items={t.evaluationCriteria}
                  leftKey="criterion"
                  rightKey="weight"
                  leftPlaceholder="Criterion"
                  rightPlaceholder="Weight"
                  onChange={(evaluationCriteria) => patch({ evaluationCriteria })}
                />
              </Section>
              <Section title="Timeline">
                <PairList
                  items={t.timeline}
                  leftKey="milestone"
                  rightKey="date"
                  leftPlaceholder="Milestone"
                  rightPlaceholder="Date"
                  onChange={(timeline) => patch({ timeline })}
                />
              </Section>
              <Section title="Submission">
                <Area label="How to submit" value={t.submissionMethod} onChange={(submissionMethod) => patch({ submissionMethod })} />
                <Area label="Format" value={t.submissionFormat} onChange={(submissionFormat) => patch({ submissionFormat })} />
                <StringList label="Documents to include" items={t.requiredDocuments} onChange={(requiredDocuments) => patch({ requiredDocuments })} />
              </Section>
              <Section title="Terms">
                <StringList items={t.terms} onChange={(terms) => patch({ terms })} placeholder="Term" />
              </Section>
              <Section title="Confirm before issue">
                <StringList items={t.gaps} onChange={(gaps) => patch({ gaps })} placeholder="Item to confirm" />
              </Section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.review}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function Section({ title, hint, accent, children }) {
  return (
    <section className={`card space-y-4 ${accent ? "border-l-4 border-l-primary" : ""}`}>
      <div>
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        {hint && <p className="text-sm text-slate-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>}
      <input className={inputClass} value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Area({ label, value, onChange }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>}
      <textarea rows={4} className={inputClass} value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function RemoveButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Remove" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700">
      <XMarkIcon className="h-4 w-4" />
    </button>
  );
}

function AddButton({ label = "Add", onClick }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">
      <PlusIcon className="h-4 w-4" /> {label}
    </button>
  );
}

function StringList({ label, items = [], onChange, placeholder }) {
  const rows = items.length ? items : [""];
  return (
    <div>
      {label && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>}
      <div className="space-y-2">
        {rows.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              className={inputClass}
              value={item}
              placeholder={placeholder}
              onChange={(event) => {
                const next = [...rows];
                next[index] = event.target.value;
                onChange(next);
              }}
            />
            <RemoveButton onClick={() => onChange(items.filter((_, i) => i !== index))} />
          </div>
        ))}
        <AddButton onClick={() => onChange([...items, ""])} />
      </div>
    </div>
  );
}

function PairList({ label, items = [], leftKey, rightKey, leftPlaceholder, rightPlaceholder, onChange }) {
  const blank = { [leftKey]: "", [rightKey]: "" };
  const rows = items.length ? items : [blank];
  const update = (index, key, value) => {
    const next = rows.map((row) => ({ ...row }));
    next[index][key] = value;
    onChange(next);
  };
  return (
    <div>
      {label && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>}
      <div className="space-y-2">
        {rows.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input className={`${inputClass} flex-[2]`} value={item[leftKey] || ""} placeholder={leftPlaceholder} onChange={(e) => update(index, leftKey, e.target.value)} />
            <input className={`${inputClass} flex-1`} value={item[rightKey] || ""} placeholder={rightPlaceholder} onChange={(e) => update(index, rightKey, e.target.value)} />
            <RemoveButton onClick={() => onChange(items.filter((_, i) => i !== index))} />
          </div>
        ))}
        <AddButton onClick={() => onChange([...items, blank])} />
      </div>
    </div>
  );
}

function Alert({ tone, text }) {
  const classes =
    tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800";
  return <div className={`rounded-lg border p-3 text-sm font-medium ${classes}`}>{text}</div>;
}
