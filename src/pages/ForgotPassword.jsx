import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import AuthLayout, { AuthAlert, AuthField } from "../components/AuthLayout";
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
    <AuthLayout
      heroTitle="Password Reset"
      heroSubtitle="SNS code reset flow"
      backLink={{ to: "/login", label: "← Back to sign in" }}
    >
      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      {success && (
        <AuthAlert tone="success">
          <span className="inline-flex items-start gap-2">
            <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {success}
              {channels.length > 0 && (
                <span className="mt-1 block text-xs opacity-80">Sent through: {channels.join(", ")}</span>
              )}
            </span>
          </span>
        </AuthAlert>
      )}

      {step === "request" ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <h2 className="mb-1 text-[13px] font-bold text-heading">Forgot Password</h2>
            <p className="mb-4 text-[10px] text-muted">Enter your email to receive a reset code.</p>
          </div>
          <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending code..." : "Send Reset Code"}
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="space-y-3.5">
          <h2 className="text-[13px] font-bold text-heading">Update Password</h2>
          <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <AuthField
            label="Reset Code"
            type="text"
            value={code}
            onChange={setCode}
            placeholder="6 digit code"
            inputMode="numeric"
          />
          <AuthField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="********"
            minLength={6}
          />
          <AuthField
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="********"
            minLength={6}
          />

          <div className="grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setStep("request")}
              disabled={loading}
              className="btn btn-secondary py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Resend
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
