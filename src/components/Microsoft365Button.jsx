import React from "react";

export function Microsoft365Mark() {
  return (
    <span className="grid h-5 w-5 grid-cols-2 gap-0.5" aria-hidden="true">
      <span className="rounded-[2px] bg-[#f25022]" />
      <span className="rounded-[2px] bg-[#7fba00]" />
      <span className="rounded-[2px] bg-[#00a4ef]" />
      <span className="rounded-[2px] bg-[#ffb900]" />
    </span>
  );
}

export default function Microsoft365Button({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-center gap-3 rounded-lg border border-white/40 px-6 py-3 font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      <Microsoft365Mark />
      {children}
    </button>
  );
}
