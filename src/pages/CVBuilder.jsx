import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  PlusIcon,
  PhotoIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "../components/DashboardLayout";
import api, { getApiError } from "../services/api";
import { resolveImageUrl } from "../utils/assets";

const STEPS = ["Personal Info", "Skills & Qualifications", "Experience", "Review & Download"];

const emptySkill = () => ({ skill: "", details: [""] });
const emptyExperience = () => ({
  company: "",
  position: "",
  period_start: "",
  period_end: "",
  scope_of_work: [""],
});

const defaultForm = () => ({
  first_name: "",
  last_name: "",
  profile_photo_url: "",
  profile_text: "",
  value_proposition: "",
  gender: "",
  nationality: "",
  date_of_birth: "",
  professional_skills: [emptySkill()],
  qualifications: [""],
  computer_skills: [""],
  professional_memberships: [""],
  languages: [""],
  experience: [emptyExperience()],
});

export default function CVBuilder() {
  const [form, setForm] = useState(defaultForm());
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFileInputKey, setPhotoFileInputKey] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const photoBlobRef = useRef(null);

  useEffect(() => {
    api
      .get("/cv")
      .then((res) => {
        const cv = res.data.cv;
        setForm((prev) => ({
          ...prev,
          ...cv,
          professional_skills: cv.professional_skills?.length
            ? cv.professional_skills
            : [emptySkill()],
          qualifications: cv.qualifications?.length ? cv.qualifications : [""],
          computer_skills: cv.computer_skills?.length ? cv.computer_skills : [""],
          professional_memberships: cv.professional_memberships?.length
            ? cv.professional_memberships
            : [""],
          languages: cv.languages?.length ? cv.languages : [""],
          experience: cv.experience?.length ? cv.experience : [emptyExperience()],
        }));
        if (cv.profile_photo_url) setPhotoPreview(resolveImageUrl(cv.profile_photo_url));
      })
      .catch((err) => {
        if (err?.response?.status !== 404) {
          setError(getApiError(err, "Failed to load your CV."));
        }
      })
      .finally(() => setLoading(false));

    return () => {
      if (photoBlobRef.current) URL.revokeObjectURL(photoBlobRef.current);
    };
  }, []);

  // ─── generic helpers for simple string arrays ───────────────────────────────

  const addItem = (field) =>
    setForm((p) => ({ ...p, [field]: [...p[field], ""] }));

  const removeItem = (field, i) =>
    setForm((p) => ({ ...p, [field]: p[field].filter((_, idx) => idx !== i) }));

  const updateItem = (field, i, val) =>
    setForm((p) => {
      const a = [...p[field]];
      a[i] = val;
      return { ...p, [field]: a };
    });

  // ─── professional_skills helpers ────────────────────────────────────────────

  const addSkill = () =>
    setForm((p) => ({ ...p, professional_skills: [...p.professional_skills, emptySkill()] }));

  const removeSkill = (i) =>
    setForm((p) => ({
      ...p,
      professional_skills: p.professional_skills.filter((_, idx) => idx !== i),
    }));

  const updateSkillName = (i, val) =>
    setForm((p) => {
      const a = [...p.professional_skills];
      a[i] = { ...a[i], skill: val };
      return { ...p, professional_skills: a };
    });

  const addSkillDetail = (si) =>
    setForm((p) => {
      const a = [...p.professional_skills];
      a[si] = { ...a[si], details: [...a[si].details, ""] };
      return { ...p, professional_skills: a };
    });

  const updateSkillDetail = (si, di, val) =>
    setForm((p) => {
      const a = [...p.professional_skills];
      const details = [...a[si].details];
      details[di] = val;
      a[si] = { ...a[si], details };
      return { ...p, professional_skills: a };
    });

  const removeSkillDetail = (si, di) =>
    setForm((p) => {
      const a = [...p.professional_skills];
      a[si] = { ...a[si], details: a[si].details.filter((_, idx) => idx !== di) };
      return { ...p, professional_skills: a };
    });

  // ─── experience helpers ─────────────────────────────────────────────────────

  const addExperience = () =>
    setForm((p) => ({ ...p, experience: [...p.experience, emptyExperience()] }));

  const removeExperience = (i) =>
    setForm((p) => ({ ...p, experience: p.experience.filter((_, idx) => idx !== i) }));

  const updateExperience = (i, field, val) =>
    setForm((p) => {
      const a = [...p.experience];
      a[i] = { ...a[i], [field]: val };
      return { ...p, experience: a };
    });

  const addScopeItem = (ei) =>
    setForm((p) => {
      const a = [...p.experience];
      a[ei] = { ...a[ei], scope_of_work: [...a[ei].scope_of_work, ""] };
      return { ...p, experience: a };
    });

  const updateScopeItem = (ei, si, val) =>
    setForm((p) => {
      const a = [...p.experience];
      const scope = [...a[ei].scope_of_work];
      scope[si] = val;
      a[ei] = { ...a[ei], scope_of_work: scope };
      return { ...p, experience: a };
    });

  const removeScopeItem = (ei, si) =>
    setForm((p) => {
      const a = [...p.experience];
      a[ei] = { ...a[ei], scope_of_work: a[ei].scope_of_work.filter((_, idx) => idx !== si) };
      return { ...p, experience: a };
    });

  // ─── API actions ─────────────────────────────────────────────────────────────

  const saveAndNext = async (nextStep) => {
    setSaving(true);
    setError("");
    setMessage("");
    setFieldErrors({});
    try {
      const res = await api.post("/cv", form);
      setForm((prev) => ({ ...prev, ...res.data.cv }));
      if (nextStep) {
        setStep(nextStep);
      } else {
        setMessage("CV saved successfully.");
      }
    } catch (err) {
      const data = err?.response?.data;
      if (data?.fields) setFieldErrors(data.fields);
      setError(getApiError(err, "Save failed. Check the highlighted fields."));
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError("");
    setMessage("");
    const formData = new FormData();
    formData.append("photo", file);
    try {
      const res = await api.post("/cv/photo", formData);
      setForm((p) => ({ ...p, profile_photo_url: res.data.profile_photo_url }));
      if (photoBlobRef.current) URL.revokeObjectURL(photoBlobRef.current);
      const blob = URL.createObjectURL(file);
      photoBlobRef.current = blob;
      setPhotoPreview(blob);
      setPhotoFileInputKey((k) => k + 1);
      setMessage("Photo updated.");
    } catch (err) {
      setError(getApiError(err, "Photo upload failed."));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const downloadPDF = async () => {
    setDownloading(true);
    setError("");
    try {
      const res = await api.get("/cv/download", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `CV_${form.first_name}_${form.last_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getApiError(err, "PDF download failed. Make sure your CV is saved first."));
    } finally {
      setDownloading(false);
    }
  };

  // ─── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-b-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-sm font-bold text-heading">CV Builder</h1>
          <p className="mt-0.5 text-[9px] font-medium text-muted">
            Build your branded SoluGrowth CV → download PDF
          </p>
        </div>

        <StepIndicator current={step} />

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}
        {message && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
            {message}
          </div>
        )}

        {step === 1 && (
          <Step1
            form={form}
            setForm={setForm}
            fieldErrors={fieldErrors}
            saving={saving}
            onNext={() => saveAndNext(2)}
          />
        )}
        {step === 2 && (
          <Step2
            form={form}
            fieldErrors={fieldErrors}
            saving={saving}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            addSkill={addSkill}
            removeSkill={removeSkill}
            updateSkillName={updateSkillName}
            addSkillDetail={addSkillDetail}
            updateSkillDetail={updateSkillDetail}
            removeSkillDetail={removeSkillDetail}
            onBack={() => setStep(1)}
            onNext={() => saveAndNext(3)}
          />
        )}
        {step === 3 && (
          <Step3
            form={form}
            fieldErrors={fieldErrors}
            saving={saving}
            addExperience={addExperience}
            removeExperience={removeExperience}
            updateExperience={updateExperience}
            addScopeItem={addScopeItem}
            updateScopeItem={updateScopeItem}
            removeScopeItem={removeScopeItem}
            onBack={() => setStep(2)}
            onNext={() => saveAndNext(4)}
          />
        )}
        {step === 4 && (
          <Step4
            form={form}
            photoPreview={photoPreview}
            photoFileInputKey={photoFileInputKey}
            uploadingPhoto={uploadingPhoto}
            saving={saving}
            downloading={downloading}
            onUploadPhoto={uploadPhoto}
            onSave={() => saveAndNext(null)}
            onDownload={downloadPDF}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Step 1: Personal Info ────────────────────────────────────────────────────

function Step1({ form, setForm, fieldErrors, saving, onNext }) {
  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className="card space-y-6">
      <SectionHeader title="Personal Information" />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <FieldLabel text="First Name" required />
          <input
            className={`input mt-1 ${fieldErrors.first_name ? "input-error" : ""}`}
            value={form.first_name}
            onChange={set("first_name")}
            placeholder="Jane"
          />
          <FieldError errors={fieldErrors} field="first_name" />
        </label>
        <label className="block">
          <FieldLabel text="Last Name" required />
          <input
            className={`input mt-1 ${fieldErrors.last_name ? "input-error" : ""}`}
            value={form.last_name}
            onChange={set("last_name")}
            placeholder="Doe"
          />
          <FieldError errors={fieldErrors} field="last_name" />
        </label>
        <label className="block">
          <FieldLabel text="Gender" required />
          <select
            className={`input mt-1 ${fieldErrors.gender ? "input-error" : ""}`}
            value={form.gender}
            onChange={set("gender")}
          >
            <option value="">Select gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Non-binary</option>
            <option>Prefer not to say</option>
          </select>
          <FieldError errors={fieldErrors} field="gender" />
        </label>
        <label className="block">
          <FieldLabel text="Nationality" required />
          <input
            className={`input mt-1 ${fieldErrors.nationality ? "input-error" : ""}`}
            value={form.nationality}
            onChange={set("nationality")}
            placeholder="South African"
          />
          <FieldError errors={fieldErrors} field="nationality" />
        </label>
        <label className="block">
          <FieldLabel text="Date of Birth" required />
          <input
            type="date"
            className={`input mt-1 ${fieldErrors.date_of_birth ? "input-error" : ""}`}
            value={form.date_of_birth}
            onChange={set("date_of_birth")}
          />
          <FieldError errors={fieldErrors} field="date_of_birth" />
        </label>
      </div>

      <label className="block">
        <FieldLabel text="Profile Summary" required />
        <p className="mb-1 text-xs text-slate-400">A short professional bio (max ~80 words).</p>
        <textarea
          rows={4}
          className={`input mt-1 ${fieldErrors.profile_text ? "input-error" : ""}`}
          value={form.profile_text}
          onChange={set("profile_text")}
          placeholder="Experienced professional with a background in..."
        />
        <FieldError errors={fieldErrors} field="profile_text" />
      </label>

      <label className="block">
        <FieldLabel text="Value Proposition" required />
        <p className="mb-1 text-xs text-slate-400">What unique value do you bring? (max ~150 words).</p>
        <textarea
          rows={5}
          className={`input mt-1 ${fieldErrors.value_proposition ? "input-error" : ""}`}
          value={form.value_proposition}
          onChange={set("value_proposition")}
          placeholder="I deliver..."
        />
        <FieldError errors={fieldErrors} field="value_proposition" />
      </label>

      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={onNext} disabled={saving}>
          {saving ? "Saving…" : "Next: Skills & Qualifications →"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Skills & Qualifications ─────────────────────────────────────────

function Step2({
  form,
  fieldErrors,
  saving,
  addItem,
  removeItem,
  updateItem,
  addSkill,
  removeSkill,
  updateSkillName,
  addSkillDetail,
  updateSkillDetail,
  removeSkillDetail,
  onBack,
  onNext,
}) {
  return (
    <div className="space-y-6">
      {/* Professional Skills */}
      <div className="card space-y-4">
        <SectionHeader title="Professional Skills" />
        <FieldError errors={fieldErrors} field="professional_skills" />
        {form.professional_skills.map((skill, si) => (
          <div key={si} className="rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                className="input flex-1"
                value={skill.skill}
                onChange={(e) => updateSkillName(si, e.target.value)}
                placeholder="Skill name (e.g. Project Management)"
              />
              {form.professional_skills.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSkill(si)}
                  className="text-rose-500 hover:text-rose-700"
                  title="Remove skill"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="ml-4 space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Details</p>
              {skill.details.map((detail, di) => (
                <div key={di} className="flex items-center gap-2">
                  <input
                    className="input flex-1 text-sm"
                    value={detail}
                    onChange={(e) => updateSkillDetail(si, di, e.target.value)}
                    placeholder="e.g. Agile, PMP certified"
                  />
                  {skill.details.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSkillDetail(si, di)}
                      className="text-rose-400 hover:text-rose-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addSkillDetail(si)}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <PlusIcon className="h-3 w-3" /> Add detail
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addSkill}
          className="btn btn-secondary inline-flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" /> Add Skill
        </button>
      </div>

      {/* Qualifications */}
      <div className="card space-y-4">
        <SectionHeader title="Qualifications & Training" />
        <FieldError errors={fieldErrors} field="qualifications" />
        <DynamicStringList
          items={form.qualifications}
          onAdd={() => addItem("qualifications")}
          onRemove={(i) => removeItem("qualifications", i)}
          onChange={(i, val) => updateItem("qualifications", i, val)}
          minItems={1}
          placeholder="e.g. BCom Information Systems, UCT, 2012"
        />
      </div>

      {/* Computer Skills */}
      <div className="card space-y-4">
        <SectionHeader title="Computer Skills" />
        <DynamicStringList
          items={form.computer_skills}
          onAdd={() => addItem("computer_skills")}
          onRemove={(i) => removeItem("computer_skills", i)}
          onChange={(i, val) => updateItem("computer_skills", i, val)}
          minItems={0}
          placeholder="e.g. Microsoft Office, SAP"
        />
      </div>

      {/* Professional Memberships */}
      <div className="card space-y-4">
        <SectionHeader title="Professional Memberships" />
        <DynamicStringList
          items={form.professional_memberships}
          onAdd={() => addItem("professional_memberships")}
          onRemove={(i) => removeItem("professional_memberships", i)}
          onChange={(i, val) => updateItem("professional_memberships", i, val)}
          minItems={0}
          placeholder="e.g. IITPSA"
        />
      </div>

      {/* Languages */}
      <div className="card space-y-4">
        <SectionHeader title="Languages" />
        <FieldError errors={fieldErrors} field="languages" />
        <DynamicStringList
          items={form.languages}
          onAdd={() => addItem("languages")}
          onRemove={(i) => removeItem("languages", i)}
          onChange={(i, val) => updateItem("languages", i, val)}
          minItems={1}
          placeholder="e.g. English"
        />
      </div>

      <div className="flex justify-between">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button className="btn btn-primary" onClick={onNext} disabled={saving}>
          {saving ? "Saving…" : "Next: Experience →"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Experience ───────────────────────────────────────────────────────

function Step3({
  form,
  fieldErrors,
  saving,
  addExperience,
  removeExperience,
  updateExperience,
  addScopeItem,
  updateScopeItem,
  removeScopeItem,
  onBack,
  onNext,
}) {
  return (
    <div className="space-y-6">
      <div className="card">
        <SectionHeader title="Work Experience" />
        <FieldError errors={fieldErrors} field="experience" />
      </div>

      {form.experience.map((exp, ei) => (
        <div key={ei} className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              {exp.company || `Experience ${ei + 1}`}
            </h3>
            {form.experience.length > 1 && (
              <button
                type="button"
                onClick={() => removeExperience(ei)}
                className="text-rose-500 hover:text-rose-700"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <FieldLabel text="Company" />
              <input
                className="input mt-1"
                value={exp.company}
                onChange={(e) => updateExperience(ei, "company", e.target.value)}
                placeholder="Acme Corp"
              />
            </label>
            <label className="block">
              <FieldLabel text="Position / Title" />
              <input
                className="input mt-1"
                value={exp.position}
                onChange={(e) => updateExperience(ei, "position", e.target.value)}
                placeholder="Senior Analyst"
              />
            </label>
            <label className="block">
              <FieldLabel text="Period Start" />
              <input
                type="month"
                className="input mt-1"
                value={exp.period_start}
                onChange={(e) => updateExperience(ei, "period_start", e.target.value)}
              />
            </label>
            <label className="block">
              <FieldLabel text="Period End" />
              <input
                type="month"
                className="input mt-1"
                value={exp.period_end}
                onChange={(e) => updateExperience(ei, "period_end", e.target.value)}
                placeholder="Leave blank if current"
              />
            </label>
          </div>

          <div>
            <FieldLabel text="Scope of Work" />
            <div className="mt-2 space-y-2">
              {exp.scope_of_work.map((item, si) => (
                <div key={si} className="flex items-center gap-2">
                  <input
                    className="input flex-1 text-sm"
                    value={item}
                    onChange={(e) => updateScopeItem(ei, si, e.target.value)}
                    placeholder="Describe a key responsibility or achievement"
                  />
                  {exp.scope_of_work.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeScopeItem(ei, si)}
                      className="text-rose-400 hover:text-rose-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addScopeItem(ei)}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <PlusIcon className="h-3 w-3" /> Add bullet
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addExperience}
        className="btn btn-secondary inline-flex w-full items-center justify-center gap-2"
      >
        <PlusIcon className="h-4 w-4" /> Add Experience Entry
      </button>

      <div className="flex justify-between">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button className="btn btn-primary" onClick={onNext} disabled={saving}>
          {saving ? "Saving…" : "Next: Review & Download →"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Review & Download ────────────────────────────────────────────────

function Step4({
  form,
  photoPreview,
  photoFileInputKey,
  uploadingPhoto,
  saving,
  downloading,
  onUploadPhoto,
  onSave,
  onDownload,
  onBack,
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Left — read-only CV summary */}
        <div className="space-y-4">
          <ReviewSection title="Personal Information">
            <dl className="space-y-2 text-sm">
              <ReviewField label="Name" value={`${form.first_name} ${form.last_name}`} />
              <ReviewField label="Gender" value={form.gender} />
              <ReviewField label="Nationality" value={form.nationality} />
              <ReviewField label="Date of Birth" value={form.date_of_birth} />
            </dl>
            {form.profile_text && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile</p>
                <p className="mt-1 text-sm text-slate-700">{form.profile_text}</p>
              </div>
            )}
            {form.value_proposition && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Value Proposition
                </p>
                <p className="mt-1 text-sm text-slate-700">{form.value_proposition}</p>
              </div>
            )}
          </ReviewSection>

          <ReviewSection title="Professional Skills">
            {form.professional_skills.map((s, i) => (
              <div key={i} className="mb-2">
                <p className="text-sm font-medium text-slate-800">{s.skill || "—"}</p>
                {s.details.filter(Boolean).length > 0 && (
                  <ul className="ml-4 mt-1 list-disc text-sm text-slate-600">
                    {s.details.filter(Boolean).map((d, di) => (
                      <li key={di}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </ReviewSection>

          <ReviewSection title="Qualifications">
            <ReviewList items={form.qualifications} />
          </ReviewSection>

          {form.computer_skills.filter(Boolean).length > 0 && (
            <ReviewSection title="Computer Skills">
              <ReviewList items={form.computer_skills} />
            </ReviewSection>
          )}

          {form.professional_memberships.filter(Boolean).length > 0 && (
            <ReviewSection title="Professional Memberships">
              <ReviewList items={form.professional_memberships} />
            </ReviewSection>
          )}

          <ReviewSection title="Languages">
            <ReviewList items={form.languages} />
          </ReviewSection>

          <ReviewSection title="Experience">
            {form.experience.map((exp, i) => (
              <div key={i} className="mb-4 last:mb-0">
                <p className="text-sm font-semibold text-slate-800">{exp.company}</p>
                <p className="text-sm text-slate-600">{exp.position}</p>
                {(exp.period_start || exp.period_end) && (
                  <p className="text-xs text-slate-400">
                    {exp.period_start} – {exp.period_end || "Present"}
                  </p>
                )}
                {exp.scope_of_work.filter(Boolean).length > 0 && (
                  <ul className="ml-4 mt-1 list-disc text-sm text-slate-600">
                    {exp.scope_of_work.filter(Boolean).map((s, si) => (
                      <li key={si}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </ReviewSection>
        </div>

        {/* Right — photo upload + download */}
        <div className="space-y-4">
          <div className="card space-y-4 hidden">
            <SectionHeader title="Profile Photo" />
            <div className="flex flex-col items-center gap-4">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  className="h-40 w-40 rounded-full object-cover border-4 border-slate-200"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-full bg-slate-100 border-4 border-slate-200">
                  <PhotoIcon className="h-16 w-16 text-slate-300" />
                </div>
              )}
              <label className="btn btn-secondary inline-flex cursor-pointer items-center gap-2">
                <PhotoIcon className="h-4 w-4" />
                {uploadingPhoto ? "Uploading…" : "Upload Photo"}
                <input
                  key={photoFileInputKey}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="sr-only"
                  onChange={onUploadPhoto}
                  disabled={uploadingPhoto}
                />
              </label>
              <p className="text-xs text-slate-400">JPG or PNG, max 5 MB</p>
            </div>
          </div>

          <div className="card space-y-4">
            <SectionHeader title="Save & Download" />
            <p className="text-sm text-slate-600">
              Save your CV data, then download it as a branded SoluGrowth PDF.
            </p>
            <button
              className="btn btn-secondary w-full"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save CV"}
            </button>
            <button
              className="btn btn-primary inline-flex w-full items-center justify-center gap-2"
              onClick={onDownload}
              disabled={downloading}
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              {downloading ? "Generating PDF…" : "Download PDF"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-start">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StepIndicator({ current }) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center gap-0">
        {STEPS.map((label, i) => {
          const num = i + 1;
          const done = current > num;
          const active = current === num;
          return (
            <li key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={
                    done
                      ? "step-circle-active"
                      : active
                        ? "step-circle-active"
                        : "step-circle-inactive"
                  }
                >
                  {done ? <CheckCircleIcon className="h-4 w-4" /> : num}
                </div>
                <span
                  className={`mt-1 hidden text-[8px] font-semibold sm:block ${active ? "text-primary" : "text-muted"}`}
                >
                  {label.split(" ")[0]}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-1 mb-3.5 h-0.5 flex-1 transition-colors ${current > num ? "bg-primary" : "bg-[#dde3e7]"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SectionHeader({ title }) {
  return (
    <h2 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-2">
      {title}
    </h2>
  );
}

function FieldLabel({ text, required }) {
  return (
    <span className="text-sm font-semibold text-slate-700">
      {text}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </span>
  );
}

function FieldError({ errors, field }) {
  if (!errors?.[field]) return null;
  return <p className="mt-1 text-xs text-rose-600">{errors[field]}</p>;
}

function DynamicStringList({ items, onAdd, onRemove, onChange, minItems, placeholder }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="input flex-1"
            value={item}
            onChange={(e) => onChange(i, e.target.value)}
            placeholder={placeholder}
          />
          {items.length > minItems && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-rose-500 hover:text-rose-700"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <PlusIcon className="h-4 w-4" /> Add
      </button>
    </div>
  );
}

function ReviewSection({ title, children }) {
  return (
    <div className="card space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      {children}
    </div>
  );
}

function ReviewField({ label, value }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function ReviewList({ items }) {
  const filtered = items.filter(Boolean);
  if (!filtered.length) return <p className="text-sm text-slate-400">None added.</p>;
  return (
    <ul className="list-disc ml-4 space-y-0.5 text-sm text-slate-700">
      {filtered.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
