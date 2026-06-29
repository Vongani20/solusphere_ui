import React from "react";
import { formatPresenceLabel } from "../utils/presence";

export function PresenceIndicator({ user, showLabel = false, className = "" }) {
  const online = Boolean(user?.is_online);
  const label = formatPresenceLabel(user);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {online ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        ) : null}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
            online ? "bg-emerald-500" : "bg-slate-300"
          }`}
          aria-hidden="true"
        />
      </span>
      {showLabel ? (
        <span className={`text-xs font-semibold ${online ? "text-emerald-600" : "text-slate-500"}`}>
          {label}
        </span>
      ) : null}
    </span>
  );
}

export function AvatarWithPresence({ user, avatar, className = "" }) {
  const online = Boolean(user?.is_online);

  return (
    <div className={`relative shrink-0 ${className}`}>
      {avatar}
      <span
        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
          online ? "bg-emerald-500" : "bg-slate-300"
        }`}
        title={formatPresenceLabel(user)}
        aria-hidden="true"
      />
    </div>
  );
}
