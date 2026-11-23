import { useEffect, useState } from "react";

// Theme preference: "light", "dark", or "system" (follow the device). Stored per browser.
const STORAGE_KEY = "ss-theme";
const CHANGE_EVENT = "ss-theme-change";
export const THEME_OPTIONS = ["light", "dark", "system"];

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export function getThemePreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEME_OPTIONS.includes(saved) ? saved : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(preference = getThemePreference()) {
  if (preference === "system") return systemPrefersDark() ? "dark" : "light";
  return preference;
}

export function applyTheme(preference = getThemePreference()) {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#0f151b" : "#fafbfc");
  return resolved;
}

export function setThemePreference(preference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage can be blocked; the theme still applies for this page view.
  }
  applyTheme(preference);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: preference }));
}

/** Applies the saved theme and keeps "system" in sync with the device setting. */
export function initTheme() {
  applyTheme();
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (getThemePreference() === "system") applyTheme("system");
  };
  media?.addEventListener?.("change", onChange);
}

export function useTheme() {
  const [preference, setPreference] = useState(getThemePreference);
  const [resolved, setResolved] = useState(() => resolveTheme(getThemePreference()));

  useEffect(() => {
    const sync = () => {
      const next = getThemePreference();
      setPreference(next);
      setResolved(resolveTheme(next));
    };
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    window.addEventListener(CHANGE_EVENT, sync);
    media?.addEventListener?.("change", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      media?.removeEventListener?.("change", sync);
    };
  }, []);

  return { preference, resolved, setPreference: setThemePreference };
}
