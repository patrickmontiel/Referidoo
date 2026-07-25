"use client";

import { useEffect, useRef } from "react";

// Ráfaga de confeti reutilizable para los momentos de festejo (lead que llena
// el formulario, cliente que termina su recorrido, asesor que recibe un lead
// nuevo). Canvas autocontenido: dispara una vez al montar, cae con gravedad y
// se autolimpia (~2s). Sin dependencias externas. Respeta prefers-reduced-motion
// (no renderiza nada). aria-hidden + pointer-events:none — es puramente decorativo.

const COLORS = ["#2563EB", "#60A5FA", "#1F9D5B", "#F5B301", "#0B0B0C"];

type ConfettiProps = {
  /** número de partículas (default 90) */
  count?: number;
  /** duración total en ms (default 2000) */
  duration?: number;
  /** origen vertical relativo del estallido, 0=arriba 1=abajo (default 0.3) */
  originY?: number;
  /** z-index del canvas (default 9999) */
  zIndex?: number;
};

export default function Confetti({ count = 90, duration = 2000, originY = 0.3, zIndex = 9999 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;
    canvas.style.width = vw + "px";
    canvas.style.height = vh + "px";
    ctx.scale(dpr, dpr);

    const cx = vw / 2;
    const cy = vh * originY;
    const parts = Array.from({ length: count }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15; // hacia arriba, con abanico
      const speed = 6 + Math.random() * 8;
      return {
        x: cx + (Math.random() - 0.5) * vw * 0.35,
        y: cy + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 5 + Math.random() * 6,
        h: 8 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.32,
        color: COLORS[(Math.random() * COLORS.length) | 0],
      };
    });

    const gravity = 0.3;
    const start = performance.now();
    let raf = 0;

    function frame(t: number) {
      const elapsed = t - start;
      const life = elapsed / duration;
      const fade = life > 0.7 ? Math.max(0, 1 - (life - 0.7) / 0.3) : 1;
      ctx!.clearRect(0, 0, vw, vh);
      for (const p of parts) {
        p.vy += gravity;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx!.save();
        ctx!.globalAlpha = fade;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx!.restore();
      }
      if (elapsed < duration) raf = requestAnimationFrame(frame);
      else ctx!.clearRect(0, 0, vw, vh);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [count, duration, originY]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex }}
    />
  );
}
