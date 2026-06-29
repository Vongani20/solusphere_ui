import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  DocumentArrowUpIcon,
  DocumentChartBarIcon,
  EyeIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import api, { getApiError } from "../services/api";
import {
  formatDate,
  formatFileSize,
  parseAnalysisResult,
  statusTone,
  titleize,
} from "../utils/formatters";

const statusOptions = ["", "pending", "processing", "completed", "failed"];
const typeOptions = ["", "invoice", "contract", "report", "form", "general"];

export default function BPOAnalysis() {
  const [file, setFile] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState("");
  const [analysisType, setAnalysisType] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAnalyses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/bpo/analyses", {
        params: {
          page,
          limit: 8,
          status: status || undefined,
          type: analysisType || undefined,
        },
      });
      setAnalyses(res.data.analyses || []);
      setPagination(res.data.pagination || null);
    } catch (err) {
      setError(getApiError(err, "Failed to load analyses."));
    } finally {
      setLoading(false);
    }
  }, [analysisType, page, status]);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  useEffect(() => {
    if (!selected || !["pending", "processing"].includes(selected.status)) return undefined;

    const timer = window.setInterval(async () => {
      try {
        const res = await api.get(`/bpo/analysis/${selected.id}`);
        setSelected(res.data.analysis);
        loadAnalyses();
      } catch {
        window.clearInterval(timer);
      }
    }, 4000);

    return () => window.clearInterval(timer);
  }, [loadAnalyses, selected]);

  const parsedResult = useMemo(() => parseAnalysisResult(selected?.analysis_result), [selected]);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) return;

    setUploading(true);
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.append("document", file);

    try {
      const res = await api.post("/bpo/analyze-pdf", formData);
      setMessage(res.data.message || "Analysis started.");
      setFile(null);
      event.target.reset();
      await loadAnalyses();
      const detail = await api.get(`/bpo/analysis/${res.data.analysis_id}`);
      setSelected(detail.data.analysis);
    } catch (err) {
      setError(getApiError(err, "Failed to upload PDF."));
    } finally {
      setUploading(false);
    }
  };

  const viewAnalysis = async (id) => {
    setError("");
    try {
      const res = await api.get(`/bpo/analysis/${id}`);
      setSelected(res.data.analysis);
    } catch (err) {
      setError(getApiError(err, "Failed to load analysis."));
    }
  };

  const deleteAnalysis = async (id) => {
    setError("");
    setMessage("");

    try {
      await api.delete(`/bpo/analysis/${id}`);
      if (selected?.id === id) setSelected(null);
      setMessage("Analysis deleted.");
      await loadAnalyses();
    } catch (err) {
      setError(getApiError(err, "Failed to delete analysis."));
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
                <DocumentArrowUpIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-950">BPO PDF Analysis</h1>
                <p className="text-sm text-slate-500">Invoices, contracts, reports, forms, and general PDFs</p>
              </div>
            </div>

            {error && <Alert tone="error" text={error} />}
            {message && <Alert tone="success" text={message} />}

            <form onSubmit={handleUpload} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">PDF document</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="block w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
                />
              </label>

              {file && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-950">{file.name}</p>
                  <p className="mt-1">{formatFileSize(file.size)}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!file || uploading}
                className="btn btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <DocumentChartBarIcon className="h-5 w-5" />
                {uploading ? "Uploading..." : "Analyze PDF"}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Analysis Queue</h2>
                <p className="text-sm text-slate-500">
                  {pagination ? `${pagination.total} total records` : "Records from /api/bpo/analyses"}
                </p>
              </div>
              <button
                type="button"
                onClick={loadAnalyses}
                className="btn btn-secondary inline-flex items-center gap-2"
              >
                <ArrowPathIcon className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <Select
                label="Status"
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                options={statusOptions}
              />
              <Select
                label="Type"
                value={analysisType}
                onChange={(value) => {
                  setAnalysisType(value);
                  setPage(1);
                }}
                options={typeOptions}
              />
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <TableHead>File</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {analyses.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-sm font-medium text-slate-500">
                          {loading ? "Loading analyses..." : "No analyses found"}
                        </td>
                      </tr>
                    ) : (
                      analyses.map((analysis) => (
                        <tr key={analysis.id} className="hover:bg-slate-50">
                          <td className="max-w-[220px] px-4 py-3">
                            <p className="truncate text-sm font-semibold text-slate-950">{analysis.filename}</p>
                            <p className="text-xs text-slate-500">{formatFileSize(analysis.file_size)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={statusTone(analysis.status)}>
                              {analysis.status || "pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{titleize(analysis.analysis_type)}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{formatDate(analysis.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => viewAnalysis(analysis.id)}
                                className="rounded-lg p-2 text-slate-600 hover:bg-primary/10 hover:text-primary"
                                aria-label={`View ${analysis.filename}`}
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteAnalysis(analysis.id)}
                                className="rounded-lg p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                                aria-label={`Delete ${analysis.filename}`}
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <p className="text-sm font-semibold text-slate-600">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Analysis Detail</h2>
              <p className="text-sm text-slate-500">
                {selected ? selected.filename : "Select a record from the queue"}
              </p>
            </div>
            {selected && (
              <span className={statusTone(selected.status)}>
                {selected.status}
              </span>
            )}
          </div>

          {!selected ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-medium text-slate-500">
              No analysis selected
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-3">
                <DetailRow label="ID" value={selected.id} />
                <DetailRow label="File size" value={formatFileSize(selected.file_size)} />
                <DetailRow label="MIME type" value={selected.mime_type || "Not reported"} />
                <DetailRow label="Pages" value={selected.page_count || "Pending"} />
                <DetailRow label="Confidence" value={`${Math.round((selected.confidence_score || 0) * 100)}%`} />
                <DetailRow label="Updated" value={formatDate(selected.updated_at)} />
              </div>

              <div className="min-w-0">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Result</h3>
                <StructuredResult data={parsedResult} />
              </div>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="input bg-white"
      >
        {options.map((option) => (
          <option key={option || "all"} value={option}>
            {option ? titleize(option) : "All"}
          </option>
        ))}
      </select>
    </label>
  );
}

function TableHead({ children }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-md border border-[#eceff1] bg-[#f8fafb] p-2.5">
      <p className="text-[7px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1.5 break-words text-[11px] font-semibold text-heading">{value}</p>
    </div>
  );
}

function StructuredResult({ data }) {
  if (!data) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
        Result not available yet
      </div>
    );
  }

  if (typeof data !== "object") {
    return <p className="break-words rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{String(data)}</p>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-950">{titleize(key)}</p>
          {typeof value === "object" && value !== null ? (
            <pre className="code-block mt-3 max-h-72">
              {JSON.stringify(value, null, 2)}
            </pre>
          ) : (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{String(value)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function Alert({ tone, text }) {
  const classes =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-rose-200 bg-rose-50 text-rose-800";

  return <div className={`mb-4 rounded-lg border p-3 text-sm font-medium ${classes}`}>{text}</div>;
}
