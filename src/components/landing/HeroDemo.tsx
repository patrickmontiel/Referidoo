"use client";

import { useEffect, useState } from "react";
import { Count } from "./Count";

/* Demo del dashboard en el hero. Todo es ilustrativo (tag "Ejemplo").
   Secuencia: llega un referido nuevo → se contacta → otro convierte y el
   premio se recalcula solo. Con prefers-reduced-motion se muestra el
   estado final sin animación; sin JS se ve el estado inicial estático. */

const ROW_H = 46;

const ROWS = [
  { id: "sofia", name: "Sofía Torres", sub: "Auto · por María L." },
  { id: "maria", name: "María López", sub: "Vida · Alejandro R." },
  { id: "carlos", name: "Carlos Pérez", sub: "PPR · Ana G." },
  { id: "rosa", name: "Rosa Flores", sub: "por Javier M." },
];

const BADGES = {
  nuevo: { label: "Nuevo", cls: "bg-[#F4F5F7] text-[#6B727D]" },
  contactado: { label: "Contactado", cls: "bg-[#EBF2FF] text-[#2563EB]" },
  convertido: { label: "Convertido", cls: "bg-green-50 text-green-700" },
} as const;

function badgeFor(id: string, stage: number): keyof typeof BADGES {
  if (id === "sofia") return stage >= 2 ? "contactado" : "nuevo";
  if (id === "maria") return stage >= 3 ? "convertido" : "contactado";
  if (id === "carlos") return "convertido";
  return "nuevo";
}

export function HeroDemo() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage(3);
      return;
    }
    const timers = [
      setTimeout(() => setStage(1), 2200),
      setTimeout(() => setStage(2), 4400),
      setTimeout(() => setStage(3), 6600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const order = stage >= 1 ? ["sofia", "maria", "carlos"] : ["maria", "carlos", "rosa"];

  const stats = [
    { label: "Clientes", value: 5, delay: 0 },
    { label: "Referidos", value: stage >= 1 ? 13 : 12, delay: 80 },
    { label: "Convertidos", value: stage >= 3 ? 5 : 4, delay: 160 },
    { label: "Pendientes", value: 3 + (stage >= 1 ? 1 : 0) - (stage >= 3 ? 1 : 0), delay: 240 },
  ];

  return (
    <div
      className="landing-cta bg-[#F4F5F7] rounded-[22px] border border-[#EAEBED] p-5 select-none"
      style={{ boxShadow: "0 12px 48px rgba(15,23,42,.12)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-bold text-[15px] text-[#0B0B0C] leading-tight">Hola, Eduardo</p>
          <p className="text-xs text-[#8A8F98]">Resumen · Julio 2026</p>
        </div>
        <span className="text-[11px] font-bold text-[#8A8F98] uppercase tracking-[0.08em]">Ejemplo</span>
      </div>

      {/* 4 stat cards in a row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-[14px] p-3">
            <p className="text-xl font-bold text-[#0B0B0C] leading-none tabular-nums">
              <Count to={s.value} duration={700} delay={s.delay} />
            </p>
            <p className="text-[10px] text-[#6B727D] mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Main: referrals list + right column */}
      <div className="grid grid-cols-[1fr_140px] gap-2">
        {/* Referrals list */}
        <div className="bg-white rounded-[14px] overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[#F4F5F7] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
            <p className="text-[11px] font-bold text-[#0B0B0C]">Referidos recientes</p>
          </div>
          <div className="relative overflow-hidden" style={{ height: ROW_H * 3 - 1 }}>
            {ROWS.map((r) => {
              const idx = order.indexOf(r.id);
              const visible = idx !== -1;
              const top = visible ? idx * ROW_H : r.id === "sofia" ? -ROW_H * 0.7 : ROW_H * 3;
              const badge = BADGES[badgeFor(r.id, stage)];
              return (
                <div
                  key={r.id}
                  className="absolute left-0 right-0 flex items-center gap-2.5 px-3 border-b border-[#F4F5F7] bg-white"
                  style={{
                    top,
                    height: ROW_H,
                    opacity: visible ? 1 : 0,
                    transition: "top 500ms cubic-bezier(0.22,1,0.36,1), opacity 400ms ease",
                  }}
                >
                  <div className="w-7 h-7 rounded-full bg-[#F4F5F7] flex items-center justify-center text-[9px] font-bold text-[#3F4651] flex-shrink-0">
                    {r.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#0B0B0C] truncate">{r.name}</p>
                    <p className="text-[9px] text-[#8A8F98] truncate">{r.sub}</p>
                  </div>
                  <span
                    key={badge.label}
                    className={`demo-badge text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: link card + earnings */}
        <div className="flex flex-col gap-2">
          <div className="bg-[#2563EB] rounded-[14px] p-3 flex-1">
            <p className="text-[9px] font-bold text-white/60 uppercase tracking-[0.06em] mb-1">Tu link</p>
            <p className="text-[10px] font-bold text-white leading-tight mb-2.5">referidoo.com/c/eduardo</p>
            <div className="bg-white/20 rounded-full px-2 py-1 text-[9px] font-semibold text-white text-center">
              Copiar
            </div>
          </div>
          <div className="bg-[#0B0B0C] rounded-[14px] p-3">
            <p className="text-[9px] text-[#9098A2] mb-1">Premios pagados</p>
            <p className="text-base font-bold text-white leading-none tabular-nums">
              <Count to={4500} prefix="$" duration={900} delay={300} />
            </p>
            <p className="text-[9px] text-[#9098A2] mt-2 mb-0.5">Por pagar</p>
            <p className="text-sm font-bold text-white leading-none tabular-nums">
              <Count to={stage >= 3 ? 3000 : 1500} prefix="$" duration={900} delay={380} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
