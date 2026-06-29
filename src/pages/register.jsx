import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import Microsoft365Button from "../components/Microsoft365Button";
import AuthLayout, { AuthAlert, AuthField } from "../components/AuthLayout";
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
    <AuthLayout heroTitle="Create Account" heroSubtitle="New SoluSphere user" title="Register">
      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      {success && (
        <AuthAlert tone="success">
          <span className="inline-flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
            {success}
          </span>
        </AuthAlert>
      )}

      <form onSubmit={handleRegister} className="space-y-3.5">
        <AuthField label="Username" type="text" value={username} onChange={setUsername} placeholder="johndoe" />
        <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <AuthField
          label="Phone Number"
          type="tel"
          value={phoneNumber}
          onChange={setPhoneNumber}
          placeholder="+27 82 000 0000"
          required={false}
        />
        <AuthField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="********"
          minLength={6}
        />

        <button
          type="submit"
          disabled={isLoading || Boolean(success)}
          className="btn btn-primary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingProvider === "local" ? "Creating..." : "Register"}
        </button>
      </form>

      <div className="my-4 h-px bg-border-ui" />

      <Microsoft365Button
        onClick={() => registerAccount("outlook365")}
        disabled={isLoading || Boolean(success) || !username || !email || password.length < 6}
        className="mb-3"
      >
        {loadingProvider === "outlook365" ? "Creating Outlook 365..." : "Create Outlook 365 Account"}
      </Microsoft365Button>

      <p className="text-center text-[10px] font-medium text-muted">
        Already registered?{" "}
        <Link to="/login" className="font-bold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
