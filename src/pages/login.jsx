import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaceSmileIcon } from "@heroicons/react/24/outline";
import Microsoft365Button from "../components/Microsoft365Button";
import AuthLayout, { AuthAlert, AuthField } from "../components/AuthLayout";
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
    <AuthLayout title="Sign In">
      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
        />

        <AuthField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="********"
          action={
            <Link to="/forgot-password" className="normal-case text-primary hover:underline">
              Forgot?
            </Link>
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="my-4 h-px bg-border-ui" />

      <button type="button" onClick={() => navigate("/face-login")} className="auth-outline-btn mb-2.5">
        <FaceSmileIcon className="h-4 w-4" />
        Face Login
      </button>

      <Microsoft365Button className="mb-3.5" onClick={() => navigate("/register")}>
        Create Outlook 365 Account
      </Microsoft365Button>

      <p className="text-center text-[10px] font-medium text-muted">
        Need an account?{" "}
        <Link to="/register" className="font-bold text-primary hover:underline">
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}
