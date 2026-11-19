import React, { useLayoutEffect, useRef } from "react";

/**
 * Wraps a normal <table>. On phones (< 768px) each row becomes a card and every cell
 * shows its column heading as a label (see `.rt-stack` in index.css). Larger screens
 * keep the regular table. Labels are read from the <thead> and kept in sync as rows change.
 */
function labelCells(root) {
  root.querySelectorAll("table").forEach((table) => {
    const headers = [];
    table.querySelectorAll("thead tr:last-child th, thead tr:last-child td").forEach((th) => {
      const span = Number(th.getAttribute("colspan") || 1);
      for (let i = 0; i < span; i += 1) headers.push((th.textContent || "").trim());
    });
    if (!headers.length) return;
    table.querySelectorAll("tbody tr").forEach((row) => {
      let column = 0;
      Array.from(row.children).forEach((cell) => {
        const label = headers[column] || "";
        if (cell.getAttribute("data-label") !== label) cell.setAttribute("data-label", label);
        column += Number(cell.getAttribute("colspan") || 1);
      });
    });
  });
}

export default function ResponsiveTable({ children, className = "" }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    labelCells(root);
    const observer = new MutationObserver(() => labelCells(root));
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`rt-stack ${className}`}>
      {children}
    </div>
  );
}
