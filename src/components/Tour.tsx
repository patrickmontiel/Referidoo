"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TourStep = {
  selector: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
};

type SpotRect = { top: number; left: number; width: number; height: number };

const TOOLTIP_W = 268;
const PAD = 8;
const GAP = 14;
const MARGIN = 12;

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

export function Tour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const [spot, setSpot] = useState<SpotRect | null>(null);
  const rafRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    const step = steps[idx];
    if (!step) return;
    const el = document.querySelector<HTMLElement>(step.selector);
    if (!el) { setSpot(null); return; }
    const r = el.getBoundingClientRect();
    setSpot({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [idx, steps]);

  useEffect(() => {
    const step = steps[idx];
    const el = step ? document.querySelector<HTMLElement>(step.selector) : null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(measure);
    });
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [idx, measure, steps]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  if (!spot) return null;

  const step = steps[idx];
  if (!step) return null;
  const isLast = idx === steps.length - 1;
  const placement = step.placement ?? "bottom";

  const sp = {
    top: spot.top - PAD,
    left: spot.left - PAD,
    width: spot.width + PAD * 2,
    height: spot.height + PAD * 2,
  };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let tipTop = 0, tipLeft = 0;

  if (placement === "bottom") {
    tipTop = sp.top + sp.height + GAP;
    tipLeft = clamp(sp.left, MARGIN, vw - TOOLTIP_W - MARGIN);
  } else if (placement === "top") {
    tipTop = sp.top - 180 - GAP;
    tipLeft = clamp(sp.left, MARGIN, vw - TOOLTIP_W - MARGIN);
  } else if (placement === "right") {
    tipTop = clamp(sp.top, MARGIN, vh - 200);
    tipLeft = sp.left + sp.width + GAP;
  } else {
    tipTop = clamp(sp.top, MARGIN, vh - 200);
    tipLeft = sp.left - TOOLTIP_W - GAP;
  }

  tipTop = clamp(tipTop, MARGIN, vh - 200);
  tipLeft = clamp(tipLeft, MARGIN, vw - TOOLTIP_W - MARGIN);

  return (
    <>
      {/* Dismiss area */}
      <div className="fixed inset-0 z-[59]" style={{ cursor: "pointer" }} onClick={onDone} />

      {/* Spotlight — box-shadow acts as dim overlay */}
      <div
        style={{
          position: "fixed",
          top: sp.top,
          left: sp.left,
          width: sp.width,
          height: sp.height,
          borderRadius: 14,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.48)",
          border: "1.5px solid rgba(255,255,255,0.2)",
          zIndex: 60,
          pointerEvents: "none",
          transition: "top 0.22s ease, left 0.22s ease, width 0.22s ease, height 0.22s ease",
        }}
      />

      {/* Tooltip */}
      <div
        style={{
          position: "fixed",
          top: tipTop,
          left: tipLeft,
          width: TOOLTIP_W,
          zIndex: 61,
          transition: "top 0.22s ease, left 0.22s ease",
        }}
        className="bg-white rounded-2xl shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step dots */}
        <div className="flex gap-1.5 mb-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === idx ? "w-5 bg-black" : i < idx ? "w-2 bg-gray-300" : "w-2 bg-gray-100"
              }`}
            />
          ))}
        </div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {idx + 1} / {steps.length}
        </p>
        <h3 className="text-sm font-semibold leading-snug mb-1.5">{step.title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-4">{step.body}</p>
        <div className="flex gap-2">
          <button
            onClick={() => { if (isLast) onDone(); else setIdx(idx + 1); }}
            className="flex-1 bg-black text-white text-xs font-medium py-2.5 rounded-xl hover:bg-gray-900 transition"
          >
            {isLast ? "Listo ✓" : "Siguiente →"}
          </button>
          {!isLast && (
            <button
              onClick={onDone}
              className="px-3.5 text-xs py-2.5 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 transition"
            >
              Saltar
            </button>
          )}
        </div>
      </div>
    </>
  );
}
