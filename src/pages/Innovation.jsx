import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LightBulbIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import api, { getApiError, getStoredUser } from "../services/api";
import { blobToBase64 } from "../utils/faceCapture";
import { formatDate, titleize } from "../utils/formatters";
import { resolveImageUrl } from "../utils/assets";

const emptyForm = {
  full_name: "",
  department: "",
  email: "",
  title: "",
  description: "",
  problem: "",
  solution: "",
  declaration_accepted: false,
  signature: "",
};

function statusTone(status) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "rejected":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "in_review":
      return "bg-amber-100 text-amber-900 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default function Innovation() {
  const user = getStoredUser();
  const isAdmin = user?.role === "admin";
  const [form, setForm] = useState({
    ...emptyForm,
    full_name: user?.username || "",
    email: user?.email || "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState({});

  const loadIdeas = useCallback(async () => {
    if (!isAdmin) {
      setIdeas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/innovation");
      setIdeas(res.data.ideas || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load innovation ideas."));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) loadIdeas();
  }, [isAdmin, loadIdeas]);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const setField = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onPhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setForm({
      ...emptyForm,
      full_name: user?.username || "",
      email: user?.email || "",
    });
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const payload = { ...form };
      if (photoFile) {
        payload.photo = await blobToBase64(photoFile);
        payload.photo_filename = photoFile.name || "photo.jpg";
      }
      const res = await api.post("/innovation", payload);
      setMessage(res.data.message || "Idea submitted successfully. Thank you!");
      resetForm();
      if (isAdmin) await loadIdeas();
    } catch (err) {
      setError(getApiError(err, "Submission failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const saveCommittee = async (ideaId) => {
    const draft = editing[ideaId];
    if (!draft) return;
    setError("");
    try {
      await api.patch(`/admin/innovation/${ideaId}`, draft);
      setMessage("Idea updated.");
      setEditing((prev) => {
        const next = { ...prev };
        delete next[ideaId];
        return next;
      });
      await loadIdeas();
    } catch (err) {
      setError(getApiError(err, "Failed to update idea."));
    }
  };

  const rows = useMemo(() => ideas, [ideas]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-[#0b2f3b] shadow-sm">
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center text-white sm:px-10">
            <img src="/SoluSphereLogoLandscapeWhite.png" alt="SoluGrowth" className="h-12 w-auto object-contain sm:h-14" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#9fd0c7]">SoluGility</p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Share your innovation idea</h1>
              <p className="mt-2 text-sm text-white/80">Every approved idea receives recognition and a reward from SoluGrowth executives.</p>
            </div>
          </div>
          <div className="h-1.5 w-full bg-[#008577]" />
        </section>

        {(message || error) && (
          <div
            className={`rounded-full border px-5 py-3 text-sm font-semibold ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="rounded-[28px] border-0 bg-white p-6 shadow-[0_8px_24px_rgba(0,40,50,0.06)] sm:p-8">
            <legend className="mb-4 w-full border-b-[3px] border-[#008577] pb-2 text-xl font-bold text-[#0d2b36]">
              Employee details
            </legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" value={form.full_name} onChange={setField("full_name")} required />
              <Field label="Business unit" value={form.department} onChange={setField("department")} required />
            </div>
            <Field label="Email address" type="email" value={form.email} onChange={setField("email")} required className="mt-5" />
          </fieldset>

          <fieldset className="rounded-[28px] border-0 bg-white p-6 shadow-[0_8px_24px_rgba(0,40,50,0.06)] sm:p-8">
            <legend className="mb-4 w-full border-b-[3px] border-[#008577] pb-2 text-xl font-bold text-[#0d2b36]">
              Your innovation
            </legend>
            <Field label="1. Idea title" value={form.title} onChange={setField("title")} required />
            <TextArea label="2. Short description" value={form.description} onChange={setField("description")} required />
            <TextArea label="3. Problem / opportunity" value={form.problem} onChange={setField("problem")} required />
            <TextArea label="4. Proposed solution (optional)" value={form.solution} onChange={setField("solution")} />
            <label className="mt-5 block text-sm font-semibold text-[#1f4b58]">
              5. Photo or drawing (optional)
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onPhotoChange}
                className="mt-2 w-full rounded-full border-[1.8px] border-[#d4e0e8] bg-[#f9fcfd] px-4 py-3 text-sm"
              />
            </label>
            <p className="mt-2 text-sm text-[#3e6572]">Camera or browse files (max 5 MB). Sent securely without multipart file transfer.</p>
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="mt-4 max-h-56 rounded-[30px] border-2 border-dashed border-[#b6d2dd] bg-[#f0f6fa] object-contain p-2" />
            ) : null}
          </fieldset>

          <fieldset className="rounded-[28px] border-0 bg-white p-6 shadow-[0_8px_24px_rgba(0,40,50,0.06)] sm:p-8">
            <legend className="mb-4 w-full border-b-[3px] border-[#008577] pb-2 text-xl font-bold text-[#0d2b36]">
              Declaration
            </legend>
            <label className="flex items-start gap-3 text-sm font-medium text-[#1f4b58]">
              <input
                type="checkbox"
                checked={form.declaration_accepted}
                onChange={setField("declaration_accepted")}
                required
                className="mt-0.5 h-5 w-5 accent-[#008577]"
              />
              I confirm this is my original idea and I agree to the review process.
            </label>
            <Field
              label="Signature & date"
              value={form.signature}
              onChange={setField("signature")}
              placeholder="e.g. full name + date"
              className="mt-5"
            />
          </fieldset>

          <div className="rounded-full border border-[#9fd0c7] bg-[#e0f2ef] px-6 py-4 text-[#0b4d45]">
            <strong>Reward notice:</strong> Every approved idea receives recognition and a reward from SoluGrowth executives.
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="min-w-[10rem] flex-1 rounded-full border-2 border-[#0b2f3b] bg-[#0b2f3b] px-8 py-3 text-base font-bold text-white shadow disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit idea"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="min-w-[8rem] flex-1 rounded-full border-2 border-[#0b2f3b] bg-white px-8 py-3 text-base font-bold text-[#0b2f3b]"
            >
              Reset
            </button>
          </div>
        </form>

        {isAdmin ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b2f3b] text-white">
                <LightBulbIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0d2b36]">Innovation responses</h2>
                <p className="text-sm text-slate-500">{rows.length} record{rows.length === 1 ? "" : "s"} · admin only</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadIdeas}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Idea</th>
                  <th className="px-3 py-3">Employee</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Submitted</th>
                  <th className="px-3 py-3">Committee</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      Loading ideas...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      No ideas submitted yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((idea) => {
                    const draft = editing[idea.id] || {
                      reviewer: idea.reviewer || "",
                      status: idea.status || "submitted",
                      comments: idea.comments || "",
                    };
                    return (
                      <tr key={idea.id} className="border-b border-slate-100 align-top">
                        <td className="px-3 py-4">
                          <p className="font-bold text-slate-900">{idea.title}</p>
                          <p className="mt-1 line-clamp-2 text-slate-500">{idea.description}</p>
                          {idea.photo_url ? (
                            <a href={resolveImageUrl(idea.photo_url)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#008577]">
                              View photo
                            </a>
                          ) : null}
                        </td>
                        <td className="px-3 py-4">
                          <p className="font-semibold text-slate-900">{idea.full_name}</p>
                          <p className="text-slate-500">{idea.department}</p>
                          <p className="text-slate-500">{idea.email}</p>
                        </td>
                        <td className="px-3 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(idea.status)}`}>
                            {titleize(String(idea.status || "submitted").replaceAll("_", " "))}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-slate-600">{formatDate(idea.created_at)}</td>
                        <td className="px-3 py-4">
                          <div className="min-w-[14rem] space-y-2">
                            <input
                              className="input"
                              placeholder="Reviewer"
                              value={draft.reviewer}
                              onChange={(e) =>
                                setEditing((prev) => ({
                                  ...prev,
                                  [idea.id]: { ...draft, reviewer: e.target.value },
                                }))
                              }
                            />
                            <select
                              className="input"
                              value={draft.status}
                              onChange={(e) =>
                                setEditing((prev) => ({
                                  ...prev,
                                  [idea.id]: { ...draft, status: e.target.value },
                                }))
                              }
                            >
                              <option value="submitted">Submitted</option>
                              <option value="in_review">In review</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            <textarea
                              className="input min-h-[4rem]"
                              placeholder="Comments"
                              value={draft.comments}
                              onChange={(e) =>
                                setEditing((prev) => ({
                                  ...prev,
                                  [idea.id]: { ...draft, comments: e.target.value },
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() => saveCommittee(idea.id)}
                              className="rounded-full bg-[#0b2f3b] px-4 py-2 text-xs font-bold text-white"
                            >
                              Save
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

function Field({ label, className = "", ...props }) {
  return (
    <label className={`block text-sm font-semibold text-[#1f4b58] ${className}`}>
      {label}
      <input
        {...props}
        className="mt-2 w-full rounded-full border-[1.8px] border-[#d4e0e8] px-5 py-3 text-base text-[#0d2b36] outline-none transition focus:border-[#008577] focus:shadow-[0_0_0_4px_rgba(0,133,119,0.15)]"
      />
    </label>
  );
}

function TextArea({ label, ...props }) {
  return (
    <label className="mt-5 block text-sm font-semibold text-[#1f4b58]">
      {label}
      <textarea
        {...props}
        className="mt-2 min-h-[130px] w-full rounded-[28px] border-[1.8px] border-[#d4e0e8] px-5 py-3 text-base text-[#0d2b36] outline-none transition focus:border-[#008577] focus:shadow-[0_0_0_4px_rgba(0,133,119,0.15)]"
      />
    </label>
  );
}
