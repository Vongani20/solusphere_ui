import React, { useEffect, useRef } from "react";

/**
 * Animated "tech" backdrop: drifting nodes linked by thin lines, over a
 * perspective grid and soft glows (the grid and glows are CSS, see .tech-bg).
 * Canvas only, no libraries. Pauses when the tab is hidden and draws a single
 * still frame for people who prefer reduced motion.
 *
 * variant: "hero" (bold, for sign-in pages) | "subtle" (faint, behind app pages)
 */
export default function TechBackground({ variant = "hero", className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const hero = variant === "hero";
    let width = 0;
    let height = 0;
    let nodes = [];
    let frame = 0;
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Density scales with area; capped so large screens stay smooth.
      const count = Math.min(hero ? 90 : 55, Math.round((width * height) / (hero ? 14000 : 26000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.4 + 0.6,
        pulse: Math.random() * Math.PI * 2,
      }));
    };

    const colors = () => {
      const dark = document.documentElement.classList.contains("dark");
      if (hero) return { node: "120, 220, 240", line: "64, 200, 230", alphaScale: 1 };
      return dark
        ? { node: "90, 190, 215", line: "60, 170, 200", alphaScale: 0.45 }
        : { node: "2, 133, 161", line: "2, 133, 161", alphaScale: 0.28 };
    };

    const draw = () => {
      const { node, line, alphaScale } = colors();
      ctx.clearRect(0, 0, width, height);
      const maxDist = hero ? 130 : 115;
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < maxDist) {
            ctx.strokeStyle = `rgba(${line}, ${(1 - d / maxDist) * 0.35 * alphaScale})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        const glow = 0.55 + Math.sin(n.pulse) * 0.35;
        ctx.fillStyle = `rgba(${node}, ${glow * alphaScale})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      if (!running) return;
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += 0.02;
        if (n.x < -10) n.x = width + 10;
        if (n.x > width + 10) n.x = -10;
        if (n.y < -10) n.y = height + 10;
        if (n.y > height + 10) n.y = -10;
      }
      draw();
      frame = window.requestAnimationFrame(step);
    };

    const onVisibility = () => {
      running = !document.hidden && !reduceMotion;
      window.cancelAnimationFrame(frame);
      if (running) frame = window.requestAnimationFrame(step);
    };

    resize();
    draw();
    if (!reduceMotion) frame = window.requestAnimationFrame(step);
    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [variant]);

  return (
    <div className={`tech-bg tech-bg-${variant} ${className}`} aria-hidden="true">
      <div className="tech-bg-grid" />
      <canvas ref={canvasRef} className="tech-bg-canvas" />
    </div>
  );
}
