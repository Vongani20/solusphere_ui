import React, { useState } from "react";
import {
  CheckCircleIcon,
  KeyIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import api, { getApiError } from "../services/api";

export default function SecurityPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.patch("/auth/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage(res.data?.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getApiError(err, "Password could not be updated."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div
          className={`rounded-lg border p-4 text-sm font-semibold ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {!error && <CheckCircleIcon className="h-5 w-5" />}
            {error || message}
          </span>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
        <div className="card">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
              <KeyIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950">Update Password</h2>
              <p className="text-sm text-slate-500">Use your current password to confirm this change.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <SecurityField
              label="Current Password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Current password"
            />
            <SecurityField
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="New password"
              minLength={6}
            />
            <SecurityField
              label="Confirm New Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm new password"
              minLength={6}
            />

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <LockClosedIcon className="h-5 w-5" />
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <ShieldCheckIcon className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-950">Recovery Setup</h2>
          </div>
          <p className="text-sm leading-6 text-slate-500">
            Forgotten password resets are handled on the sign-in screen. The backend sends a short-lived reset code by email
            and by AWS SNS SMS when a phone number is stored on the account.
          </p>
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            Keep your email and phone number current so reset codes can reach you.
          </div>
        </div>
      </section>
    </div>
  );
}

function SecurityField({ label, value, onChange, placeholder, minLength }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          minLength={minLength}
          className="input pl-10"
          required
        />
      </span>
    </label>
  );
}
