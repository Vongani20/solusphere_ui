import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircleIcon,
  EnvelopeIcon,
  LockClosedIcon,
  PhoneIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import Microsoft365Button from "../components/Microsoft365Button";
import api, { getApiError } from "../services/api";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loadingProvider, setLoadingProvider] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const registerAccount = async (provider) => {
    setLoadingProvider(provider);
    setError("");
    setSuccess("");

    try {
      const endpoint = provider === "outlook365" ? "/auth/outlook365/signup" : "/auth/register";
      const res = await api.post(endpoint, {
        username,
        email,
        phone_number: phoneNumber,
        password,
      });
      setSuccess(res.data?.message || "Account created. Redirecting to sign in.");
      window.setTimeout(() => navigate("/login"), 1400);
    } catch (err) {
      setError(getApiError(err, "Registration failed. Please try again."));
    } finally {
      setLoadingProvider("");
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    registerAccount("local");
  };

  const isLoading = Boolean(loadingProvider);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-primary to-cyan-700 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/SoluSphereLogoWhite.png" alt="SoluSphere" className="mx-auto mb-4 h-20 object-contain" />
          <p className="text-sm font-medium text-white/80">Create your SoluSphere account</p>
        </div>

        <div className="rounded-lg border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
          <h1 className="text-2xl font-bold text-white">Register</h1>

          {error && (
            <div className="mt-5 rounded-lg border border-rose-200/40 bg-rose-500/20 p-3 text-sm font-medium text-white">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-emerald-200/40 bg-emerald-500/20 p-3 text-sm font-medium text-white">
              <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleRegister} className="mt-6 space-y-5">
            <Field
              label="Username"
              type="text"
              value={username}
              onChange={setUsername}
              placeholder="johndoe"
              icon={UserIcon}
            />
            <Field
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              icon={EnvelopeIcon}
            />
            <Field
              label="Phone Number"
              type="tel"
              value={phoneNumber}
              onChange={setPhoneNumber}
              placeholder="+27 82 000 0000"
              icon={PhoneIcon}
              required={false}
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="********"
              icon={LockClosedIcon}
              minLength={6}
            />

            <button
              type="submit"
              disabled={isLoading || Boolean(success)}
              className="w-full rounded-lg bg-white px-6 py-3 font-bold text-primary transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingProvider === "local" ? "Creating..." : "Create Account"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-white/55">
            <span className="h-px flex-1 bg-white/20" />
            or
            <span className="h-px flex-1 bg-white/20" />
          </div>

          <Microsoft365Button
            onClick={() => registerAccount("outlook365")}
            disabled={isLoading || Boolean(success) || !username || !email || password.length < 6}
          >
            {loadingProvider === "outlook365" ? "Creating Outlook 365..." : "Create Outlook 365 Account"}
          </Microsoft365Button>

          <p className="mt-3 text-center text-xs leading-5 text-white/60">
            Add a phone number if this account should receive AWS SNS reset codes by SMS.
          </p>

          <p className="mt-6 text-center text-sm text-white/80">
            Already registered?{" "}
            <Link to="/login" className="font-bold text-white underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-white/70">SoluSphere {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, icon: Icon, minLength, required = true }) {
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
          className="w-full rounded-lg border border-white/25 bg-white/15 py-3 pl-10 pr-4 text-white placeholder-white/50 outline-none transition focus:border-white focus:ring-2 focus:ring-white/40"
          required={required}
        />
      </span>
    </label>
  );
}
