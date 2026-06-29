import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://d25x8zzf939iqa.cloudfront.net/api";

export const ROOT_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const PUBLIC_API_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/face-login",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/outlook365/signup",
];

function isPublicApiPath(url = "") {
  const path = url.replace(/^https?:\/\/[^/]+/i, "").split("?")[0];
  return PUBLIC_API_PATHS.some(
    (publicPath) => path === publicPath || path.endsWith(publicPath)
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const rootApi = axios.create({
  baseURL: ROOT_BASE_URL,
});

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function saveSession({ token, user }) {
  if (token) {
    localStorage.setItem("token", token);
  }
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getApiError(error, fallback = "Something went wrong.") {
  if (error?.message === "Network Error") {
    if (window.location.protocol === "https:" && API_BASE_URL.startsWith("http:")) {
      return "Cannot reach the API from this secure page. Use HTTPS for the API or open the app over HTTP.";
    }
    return "Network error — could not reach the server. Check your connection and try again.";
  }

  const status = error?.response?.status;
  if (status === 403) {
    return "Upload blocked by the server (403). Try password login, hard-refresh, or contact support if this continues.";
  }

  const data = error?.response?.data;
  let candidate =
    data?.error ||
    data?.message ||
    (typeof data?.details === "string" ? data.details : null);

  if (!candidate && typeof data === "string" && data.trim()) {
    candidate = data;
  }

  if (typeof candidate === "string" && candidate.trim()) {
    return candidate;
  }

  if (status) {
    return `${fallback} (HTTP ${status})`;
  }

  return fallback;
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && !isPublicApiPath(config.url || "")) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers) {
      delete config.headers.Authorization;
      delete config.headers.authorization;
    }

    if (config.data instanceof FormData) {
      // Let axios set multipart boundary automatically.
      if (config.headers?.delete) {
        config.headers.delete("Content-Type");
        config.headers.delete("content-type");
      } else if (config.headers) {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
      config.timeout = config.timeout ?? 120000;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem("token")) {
      clearSession();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
