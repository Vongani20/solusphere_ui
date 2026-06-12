import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  EnvelopeIcon,
  FaceSmileIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import Microsoft365Button from "../components/Microsoft365Button";
import api, { getApiError, saveSession } from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      saveSession({ token: res.data.token, user: res.data.user });
      navigate(res.data.face_required ? "/profile" : "/dashboard");
    } catch (err) {
      setError(getApiError(err, "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-primary to-cyan-700 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/SoluSphereLogoWhite.png" alt="SoluSphere" className="mx-auto mb-4 h-20 object-contain" />
          <p className="text-sm font-medium text-white/80">Operations, support, automation, and analysis</p>
        </div>

        <div className="rounded-lg border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
          <h1 className="text-2xl font-bold text-white">Sign In</h1>

          {error && (
            <div className="mt-5 rounded-lg border border-rose-200/40 bg-rose-500/20 p-3 text-sm font-medium text-white">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-white">Email Address</span>
              <span className="relative block">
                <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-white/25 bg-white/15 py-3 pl-10 pr-4 text-white placeholder-white/50 outline-none transition focus:border-white focus:ring-2 focus:ring-white/40"
                  required
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-white">
                Password
                <Link to="/forgot-password" className="text-xs font-bold text-white/85 underline underline-offset-4 hover:text-white">
                  Forgot password?
                </Link>
              </span>
              <span className="relative block">
                <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  className="w-full rounded-lg border border-white/25 bg-white/15 py-3 pl-10 pr-4 text-white placeholder-white/50 outline-none transition focus:border-white focus:ring-2 focus:ring-white/40"
                  required
                />
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white px-6 py-3 font-bold text-primary transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="my-6 h-px bg-white/20" />

          <button
            type="button"
            onClick={() => navigate("/face-login")}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/40 px-6 py-3 font-bold text-white transition hover:bg-white/10"
          >
            <FaceSmileIcon className="h-5 w-5" />
            Face Login
          </button>

          <Microsoft365Button className="mt-3" onClick={() => navigate("/register")}>
            Create Outlook 365 Account
          </Microsoft365Button>

          <p className="mt-6 text-center text-sm text-white/80">
            Need an account?{" "}
            <Link to="/register" className="font-bold text-white underline underline-offset-4">
              Register
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-white/70">SoluSphere {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
