import React, { useEffect, useRef } from "react";

/**
 * The "SoluSphere" 3D fixture: a globe of evenly spread points (Fibonacci sphere),
 * linked into a mesh, with two tilted orbit rings carrying satellites.
 * Rendered with plain canvas 3D projection (no libraries). Rotates slowly, tilts
 * towards the pointer, pauses off-screen / when the tab is hidden, and shows a
 * still frame for people who prefer reduced motion.
 */
export default function Sphere3D({ size = 360, points = 260, className = "", label = "SoluSphere" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Evenly distributed points on a unit sphere.
    const golden = Math.PI * (3 - Math.sqrt(5));
    const pts = Array.from({ length: points }, (_, i) => {
      const y = 1 - (i / (points - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
    });
    // Precompute a light mesh: each point links to its 3 nearest neighbours.
    const links = [];
    pts.forEach((p, i) => {
      const near = pts
        .map((q, j) => ({ j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2 }))
        .filter((o) => o.j > i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      near.forEach((o) => links.push([i, o.j]));
    });

    const radius = size * 0.34;
    const cx = size / 2;
    const cy = size / 2;
    const focal = size * 1.6;
    let angleY = 0.6;
    let tiltX = -0.35;
    let targetTiltX = tiltX;
    let targetTurn = 0;
    let turn = 0;
    let t = 0;
    let frame = 0;
    let visible = true;

    const rotate = (p, ay, ax) => {
      const cosY = Math.cos(ay);
      const sinY = Math.sin(ay);
      let x = p.x * cosY - p.z * sinY;
      let z = p.x * sinY + p.z * cosY;
      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);
      const y = p.y * cosX - z * sinX;
      z = p.y * sinX + z * cosX;
      return { x, y, z };
    };
    const project = (p) => {
      const scale = focal / (focal + p.z * radius);
      return { x: cx + p.x * radius * scale, y: cy + p.y * radius * scale, s: scale, z: p.z };
    };

    const dark = () => document.documentElement.classList.contains("dark") || canvas.closest(".tech-surface");

    const drawRing = (tilt, spin, rx, color, satellites) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k <= 96; k += 1) {
        const a = (k / 96) * Math.PI * 2;
        const p = project(rotate({ x: Math.cos(a) * rx, y: 0, z: Math.sin(a) * rx }, angleY * 0.4 + spin, tiltX + tilt));
        if (k === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      satellites.forEach((offset) => {
        const a = t * 0.6 + offset;
        const p = project(rotate({ x: Math.cos(a) * rx, y: 0, z: Math.sin(a) * rx }, angleY * 0.4 + spin, tiltX + tilt));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7 * p.s);
        g.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        g.addColorStop(0.35, "rgba(94, 234, 212, 0.9)");
        g.addColorStop(1, "rgba(94, 234, 212, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7 * p.s, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    };

    const draw = () => {
      const onDark = dark();
      ctx.clearRect(0, 0, size, size);

      // Core glow behind the globe.
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.45);
      glow.addColorStop(0, onDark ? "rgba(43, 179, 207, 0.35)" : "rgba(2, 133, 161, 0.22)");
      glow.addColorStop(1, "rgba(2, 133, 161, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.45, 0, Math.PI * 2);
      ctx.fill();

      drawRing(1.15, 0.3, 1.42, onDark ? "rgba(94, 234, 212, 0.35)" : "rgba(2, 133, 161, 0.3)", [0, Math.PI]);
      drawRing(-0.9, -0.8, 1.25, onDark ? "rgba(125, 211, 252, 0.28)" : "rgba(14, 116, 144, 0.25)", [1.4]);

      const projected = pts.map((p) => project(rotate(p, angleY + turn, tiltX)));
      // Mesh lines, fading with depth so the back of the globe recedes.
      for (const [i, j] of links) {
        const a = projected[i];
        const b = projected[j];
        const depth = (2 - (a.z + b.z)) / 4; // 0 (back) .. 1 (front)
        ctx.strokeStyle = onDark
          ? `rgba(103, 232, 249, ${0.05 + depth * 0.32})`
          : `rgba(2, 133, 161, ${0.04 + depth * 0.26})`;
        ctx.lineWidth = 0.6 + depth * 0.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // Points, nearer = bigger and brighter.
      projected
        .slice()
        .sort((a, b) => b.z - a.z)
        .forEach((p) => {
          const depth = (1 - p.z) / 2;
          ctx.fillStyle = onDark
            ? `rgba(165, 243, 252, ${0.2 + depth * 0.8})`
            : `rgba(2, 110, 135, ${0.15 + depth * 0.75})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, (0.7 + depth * 1.8) * p.s, 0, Math.PI * 2);
          ctx.fill();
        });
    };

    const step = () => {
      t += 0.016;
      angleY += 0.0045;
      tiltX += (targetTiltX - tiltX) * 0.05;
      turn += (targetTurn - turn) * 0.05;
      draw();
      if (visible) frame = window.requestAnimationFrame(step);
    };

    const onPointer = (event) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (event.clientX - (rect.left + rect.width / 2)) / window.innerWidth;
      const ny = (event.clientY - (rect.top + rect.height / 2)) / window.innerHeight;
      targetTurn = nx * 0.9;
      targetTiltX = -0.35 + ny * 0.6;
    };

    const setVisible = (value) => {
      visible = value && !document.hidden && !reduceMotion;
      window.cancelAnimationFrame(frame);
      if (visible) frame = window.requestAnimationFrame(step);
    };

    draw();
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(canvas);
    const onVisibility = () => setVisible(true);
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduceMotion) window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      visible = false;
      window.cancelAnimationFrame(frame);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [points, size]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`${label}: a rotating 3D globe`}
      className={`sphere-3d ${className}`}
      style={{ width: size, height: size, maxWidth: "100%", aspectRatio: "1 / 1" }}
    />
  );
}
