import React, { useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import api, { getApiError } from "../services/api";
import { formatDate, formatFileSize } from "../utils/formatters";

export default function FileUploads() {
  const [file, setFile] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploads((items) => [
        {
          ...res.data,
          uploaded_at: new Date().toISOString(),
        },
        ...items,
      ]);
      setFile(null);
      event.target.reset();
    } catch (err) {
      setError(getApiError(err, "Upload failed."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-600 text-white">
                <ArrowUpTrayIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-950">File Uploads</h1>
                <p className="text-sm text-slate-500">General file intake</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
                {error}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">File</span>
                <input
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="block w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
                />
              </label>

              {file && (
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <DocumentIcon className="h-6 w-6 shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{file.name}</p>
                    <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!file || uploading}
                className="btn btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <ArrowUpTrayIcon className="h-5 w-5" />
                {uploading ? "Uploading..." : "Upload File"}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Recent Uploads</h2>
                <p className="text-sm text-slate-500">{uploads.length} uploaded this session</p>
              </div>
              <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <TableHead>Filename</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Location</TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {uploads.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-4 py-10 text-center text-sm font-medium text-slate-500">
                          No uploads yet
                        </td>
                      </tr>
                    ) : (
                      uploads.map((upload, index) => (
                        <tr key={`${upload.filename}-${index}`} className="hover:bg-slate-50">
                          <td className="max-w-[260px] px-4 py-3">
                            <p className="truncate text-sm font-semibold text-slate-950">{upload.filename}</p>
                            <p className="text-xs text-slate-500">{upload.message}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{formatFileSize(upload.file_size)}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{formatDate(upload.uploaded_at)}</td>
                          <td className="max-w-[260px] px-4 py-3">
                            {String(upload.file_url || "").startsWith("http") ? (
                              <a
                                href={upload.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark"
                              >
                                Open
                                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                              </a>
                            ) : (
                              <p className="truncate text-sm text-slate-500">{upload.file_url || "Not returned"}</p>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function TableHead({ children }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}
