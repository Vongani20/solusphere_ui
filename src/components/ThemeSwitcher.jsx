import React from "react";
import { ComputerDesktopIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/theme";

const OPTIONS = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: ComputerDesktopIcon },
];

/** Three-way Light / Dark / System switch. */
export default function ThemeSwitcher({ className = "" }) {
  const { preference, setPreference } = useTheme();

  return (
    <div role="radiogroup" aria-label="Theme" className={`theme-switch ${className}`}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(value)}
            title={value === "system" ? "Follow this device's setting" : `${label} theme`}
            className={`theme-switch-option ${active ? "active" : ""}`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
