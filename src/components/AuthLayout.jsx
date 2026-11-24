import React from "react";
import { Link } from "react-router-dom";
import Sphere3D from "./Sphere3D";
import TechBackground from "./TechBackground";

export function AuthField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  minLength,
  required = true,
  inputMode,
  action,
}) {
  return (
    <label className="block">
      <span className="field-label flex items-center justify-between gap-2">
        <span>{label}</span>
        {action}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        minLength={minLength}
        inputMode={inputMode}
        className="input"
        required={required}
      />
    </label>
  );
}

export function AuthAlert({ tone, children }) {
  const classes =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "info"
        ? "border-[#c5e7ef] bg-[#f3fbfd] text-[#026d84]"
        : "border-rose-200 bg-rose-50 text-rose-800";

  return (
    <div className={`mb-4 rounded-md border p-3 text-sm font-medium ${classes}`}>
      {children}
    </div>
  );
}

export default function AuthLayout({
  heroTitle = "SoluSphere",
  heroSubtitle = "Operations · support · automation · analysis",
  title,
  children,
  backLink,
  footer,
}) {
  return (
    <div className="tech-surface relative min-h-screen overflow-hidden">
      <TechBackground variant="hero" className="fixed inset-0" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:px-10">
        {/* Brand side with the 3D fixture (large screens) */}
        <section className="hidden min-w-0 lg:block">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg shadow-cyan-500/20">
              <img src="/icon.png" alt="" className="h-6 w-6 rounded-md object-contain" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">SoluSphere</span>
          </div>
          <h2 className="tech-headline mt-8 text-5xl font-extrabold leading-[1.05] tracking-tight">
            One sphere for
            <br />
            your whole operation.
          </h2>
          <p className="mt-4 max-w-md text-base text-slate-300">
            Chat, calls, tasks, tenders, CVs and analysis, connected in one secure workspace.
          </p>
          <div className="relative mt-4 flex justify-center">
            <Sphere3D size={400} points={280} />
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {["Face sign-in", "Secure calls", "AI tender proposals", "Paperless"].map((chip) => (
              <li key={chip} className="tech-chip">
                {chip}
              </li>
            ))}
          </ul>
        </section>

        {/* Form side */}
        <div className="mx-auto w-full min-w-0 max-w-md">
          <div className="mb-4 flex flex-col items-center lg:hidden">
            <Sphere3D size={150} points={160} />
            <span className="-mt-2 text-base font-bold tracking-tight text-white">SoluSphere</span>
          </div>

          {backLink && (
            <Link
              to={backLink.to}
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-200 hover:text-white"
            >
              {backLink.label}
            </Link>
          )}

          <div className="auth-glass">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-slate-200">
                <img src="/icon.png" alt="" className="h-6 w-6 rounded-md object-contain" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-base font-bold text-heading">{heroTitle}</div>
                <div className="truncate text-[11px] font-medium text-label">{heroSubtitle}</div>
              </div>
            </div>
            {title && <h1 className="mb-4 text-xl font-bold text-heading">{title}</h1>}
            {children}
          </div>

          <div className="tech-footer">{footer}</div>
        </div>
      </div>
    </div>
  );
}
