import React from "react";
import { Link } from "react-router-dom";

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
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-[380px]">
        {backLink && (
          <Link
            to={backLink.to}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-label hover:text-primary"
          >
            {backLink.label}
          </Link>
        )}

        <div className="auth-card">
          <div className="auth-hero">
            <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-[11px] bg-white/92">
              <img src="/icon.png" alt="" className="h-6 w-6 rounded-md object-contain" />
            </div>
            <div className="text-[17px] font-bold text-white">{heroTitle}</div>
            <div className="mt-0.5 text-[10px] font-medium text-white/75">{heroSubtitle}</div>
          </div>

          <div className="auth-body">
            {title && <h1 className="mb-4 text-[15px] font-bold text-heading">{title}</h1>}
            {children}
          </div>
        </div>

        {footer}
      </div>
    </div>
  );
}
