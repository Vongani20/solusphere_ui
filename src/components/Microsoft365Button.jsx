import React from "react";

export function Microsoft365Mark() {
  return (
    <span className="grid h-4 w-4 grid-cols-2 gap-0.5" aria-hidden="true">
      <span className="rounded-[2px] bg-[#f25022]" />
      <span className="rounded-[2px] bg-[#7fba00]" />
      <span className="rounded-[2px] bg-[#00a4ef]" />
      <span className="rounded-[2px] bg-[#ffb900]" />
    </span>
  );
}

export default function Microsoft365Button({ children, className = "", ...props }) {
  return (
    <button type="button" className={`auth-outline-btn ${className}`} {...props}>
      <Microsoft365Mark />
      {children}
    </button>
  );
}
