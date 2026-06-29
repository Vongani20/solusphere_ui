export function formatDateOnly(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const raw = String(value).trim();
    return raw.length >= 10 ? raw.slice(0, 10) : raw || "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

export function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatFileSize(bytes = 0) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function parseAnalysisResult(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
}

export function titleize(value) {
  if (!value) return "General";
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function statusTone(status) {
  switch (String(status || "").toLowerCase()) {
    case "completed":
    case "done":
    case "resolved":
    case "active":
    case "healthy":
    case "configured":
    case "admin":
      return "status-pill-success";
    case "processing":
    case "proc":
    case "pending":
    case "open":
    case "in_progress":
    case "in progress":
      return "status-pill-pending";
    case "failed":
    case "fail":
    case "unhealthy":
    case "not_configured":
    case "closed":
      return "status-pill-error";
    case "draft":
    case "past":
    case "user":
      return "status-pill-neutral";
    default:
      return "status-pill-neutral";
  }
}
