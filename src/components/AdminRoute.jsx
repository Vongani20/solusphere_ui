import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api, { saveSession } from "../services/api";

export default function AdminRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    api
      .get("/profile")
      .then((res) => {
        if (!mounted) return;
        const user = res.data?.user;
        saveSession({ user });
        setIsAdmin(user?.role === "admin");
      })
      .catch(() => {
        if (mounted) setIsAdmin(false);
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-b-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-500">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
