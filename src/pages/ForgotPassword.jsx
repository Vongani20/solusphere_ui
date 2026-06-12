import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  KeyIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import api, { getApiError } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [channels, setChannels] = useState([]);
  const [step, setStep] = useState("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const sendCode = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.post("/auth/forgot-password", { email });
      setChannels(res.data?.channels || []);
      setSuccess(res.data?.message || "Password reset code sent.");
      setStep("reset");
    } catch (err) {
      setError(getApiError(err, "Could not send a password reset code."));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        email,
        code,
        new_password: newPassword,
      });
      setSuccess(res.data?.message || "Password updated successfully.");
      window.setTimeout(() => navigate("/login"), 1400);
    } catch (err) {
      setError(getApiError(err, "Could not reset password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-primary to-cyan-700 p-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="mb-5 inline-flex items-center gap-2 font-semibold text-white hover:text-cyan-100">
          <ArrowLeftIcon className="h-5 w-5" />
          Back to sign in
        </Link>

        <div className="mb-8 text-center">
          <img src="/SoluSphereLogoWhite.png" alt="SoluSphere" className="mx-auto mb-4 h-20 object-contain" />
          <p className="text-sm font-medium text-white/80">Recover access with a secure reset code</p>
        </div>

        <div className="rounded-lg border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-primary">
              <KeyIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
              <p className="mt-1 text-sm leading-6 text-white/70">
                Codes are delivered by email and by AWS SNS SMS when your account has a phone number.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-rose-200/40 bg-rose-500/20 p-3 text-sm font-medium text-white">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-emerald-200/40 bg-emerald-500/20 p-3 text-sm font-medium text-white">
              <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                {success}
                {channels.length > 0 && (
                  <span className="mt-1 block text-xs text-white/70">Sent through: {channels.join(", ")}</span>
                )}
              </span>
            </div>
          )}

          {step === "request" ? (
            <form onSubmit={sendCode} className="mt-6 space-y-5">
              <AuthField
                label="Email Address"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                icon={EnvelopeIcon}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-white px-6 py-3 font-bold text-primary transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending code..." : "Send Reset Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="mt-6 space-y-5">
              <AuthField
                label="Email Address"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                icon={EnvelopeIcon}
              />
              <AuthField
                label="Reset Code"
                type="text"
                value={code}
                onChange={setCode}
                placeholder="6 digit code"
                icon={DevicePhoneMobileIcon}
                inputMode="numeric"
              />
              <AuthField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="********"
                icon={LockClosedIcon}
                minLength={6}
              />
              <AuthField
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="********"
                icon={LockClosedIcon}
                minLength={6}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  disabled={loading}
                  className="rounded-lg border border-white/40 px-6 py-3 font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Resend
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-white px-6 py-3 font-bold text-primary transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function AuthField({ label, type, value, onChange, placeholder, icon: Icon, minLength, inputMode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-white">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          minLength={minLength}
          inputMode={inputMode}
          className="w-full rounded-lg border border-white/25 bg-white/15 py-3 pl-10 pr-4 text-white placeholder-white/50 outline-none transition focus:border-white focus:ring-2 focus:ring-white/40"
          required
        />
      </span>
    </label>
  );
}
