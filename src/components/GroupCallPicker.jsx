import React, { useEffect, useMemo, useState } from "react";
import { MagnifyingGlassIcon, PhoneIcon, VideoCameraIcon, XMarkIcon } from "@heroicons/react/24/outline";
import api, { getApiError } from "../services/api";
import UserAvatar from "./UserAvatar";
import { PresenceIndicator } from "./PresenceIndicator";

/**
 * Modal to choose people for a group call.
 * With `showCallType`, the confirm callback receives (userIds, callType).
 */
export default function GroupCallPicker({
  title = "Start a group call",
  confirmLabel = "Call",
  excludeIds = [],
  maxSelectable = 7,
  showCallType = false,
  onConfirm,
  onClose,
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [callType, setCallType] = useState("audio");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/users")
      .then((res) => {
        if (!cancelled) setUsers(res.data.users || []);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiError(err, "Could not load people."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const visible = useMemo(() => {
    const excluded = new Set(excludeIds);
    const needle = query.trim().toLowerCase();
    return users
      .filter((user) => !excluded.has(user.id))
      .filter(
        (user) =>
          !needle ||
          user.username?.toLowerCase().includes(needle) ||
          user.email?.toLowerCase().includes(needle)
      )
      .sort((a, b) => Number(b.is_online) - Number(a.is_online) || a.username.localeCompare(b.username));
  }, [excludeIds, query, users]);

  const toggle = (id) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= maxSelectable) return current;
      return [...current, id];
    });
  };

  const atLimit = selected.length >= maxSelectable;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            <p className="text-sm text-slate-500">
              {selected.length} selected · up to {maxSelectable}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-5 py-3">
          <label className="relative block">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people"
              className="input w-full pl-9"
            />
          </label>
          {showCallType ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { value: "audio", label: "Voice", Icon: PhoneIcon },
                { value: "video", label: "Video", Icon: VideoCameraIcon },
              ].map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCallType(value)}
                  aria-pressed={callType === value}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                    callType === value ? "border-primary bg-primary/10 text-primary-dark" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {error ? <p className="p-3 text-sm text-rose-700">{error}</p> : null}
          {loading ? <p className="p-3 text-sm text-slate-500">Loading people…</p> : null}
          {!loading && !visible.length ? <p className="p-3 text-sm text-slate-500">No one to add.</p> : null}
          {visible.map((user) => {
            const checked = selected.includes(user.id);
            const disabled = !checked && atLimit;
            return (
              <label
                key={user.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 ${
                  checked ? "bg-primary/5" : "hover:bg-slate-50"
                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(user.id)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <UserAvatar user={user} className="h-9 w-9" iconClassName="h-5 w-5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-slate-900">{user.username}</span>
                    <PresenceIndicator user={user} showLabel />
                  </div>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected.length}
            onClick={() => onConfirm?.(selected, callType)}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmLabel}
            {selected.length ? ` (${selected.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
