"use client";

import { useEffect, useRef, useState } from "react";

/* Datos de la industria: tasa de cierre por canal (barras) y de dónde vienen
   los clientes nuevos de un asesor (dona). Las barras crecen al entrar en
   viewport — enhancement-only: sin JS o con reduced-motion todo se ve
   completo desde el primer render. */

const CHANNELS = [
  { label: "Referidos", pct: 25.6, display: "25.6%", highlight: true },
  { label: "Email", pct: 22.8, display: "22.8%" },
  { label: "Búsqueda en Google", pct: 21.2, display: "21.2%" },
  { label: "Alianzas", pct: 18.0, display: "18%" },
  { label: "Publicidad de pago", pct: 15.7, display: "15.7%" },
  { label: "Eventos y ferias", pct: 13.6, display: "13.6%" },
  { label: "Redes sociales", pct: 11.6, display: "11.6%" },
  { label: "Llamadas en frío", pct: 9.4, display: "9.4%" },
  { label: "Leads comprados", pct: 3, display: "1–5%", dim: true },
];

const MAX_PCT = CHANNELS[0].pct;

const MIX = [
  { label: "Referidos y recomendaciones", pct: 60, color: "#2563EB" },
  { label: "Canales propios (email, web, alianzas)", pct: 25, color: "#0B0B0C" },
  { label: "Frío y publicidad", pct: 15, color: "#C9CDD4" },
];

export function ChannelData() {
  const ref = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setArmed(true);
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} id="por-que-referidos" className="scroll-mt-24 max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
      <div className="text-center mb-10">
        <h2
          className="font-extrabold tracking-[-0.028em] text-[#0B0B0C] mb-4 max-w-2xl mx-auto text-balance"
          style={{ fontSize: "clamp(1.75rem, 4vw, 39px)" }}
        >
          Ningún canal cierra como un{" "}
          <span className="whitespace-nowrap">
            referidoo<span className="inline-block rounded-full bg-[#3B82F6] ml-1" style={{ width: "0.24em", height: "0.24em" }} />
          </span>
        </h2>
        <p className="text-[#5A626E] max-w-xl mx-auto leading-[1.6]" style={{ fontSize: 18 }}>
          Los datos no son nuestros — son de la industria. Un referido cierra
          casi 3 veces más que una llamada en frío, y cuesta cero.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        {/* Barras: tasa de cierre por canal */}
        <div className="md:col-span-3 bg-[#F4F5F7] rounded-[20px] border border-[#ECEDEF] p-6">
          <div className="flex items-center justify-between mb-5 gap-3">
            <h3 className="font-bold text-[17px] text-[#0B0B0C]">Tasa de cierre por canal</h3>
            <span className="text-[11px] font-bold text-[#8A8F98] uppercase tracking-[0.08em] flex-shrink-0">
              Focus Digital 2025
            </span>
          </div>
          <div className="space-y-2.5">
            {CHANNELS.map((c, i) => (
              <div key={c.label} className="grid items-center gap-2 sm:gap-3 grid-cols-[96px_1fr_44px] sm:grid-cols-[132px_1fr_52px]">
                <span
                  className={`text-[11px] sm:text-[13px] text-right leading-tight ${
                    c.highlight ? "font-bold text-[#0B0B0C]" : c.dim ? "text-[#9AA1AB]" : "text-[#5A626E]"
                  }`}
                >
                  {c.label}
                </span>
                <div className="h-7 rounded-[8px] bg-white overflow-hidden">
                  <div
                    className="h-full rounded-[8px]"
                    style={{
                      backgroundColor: c.highlight ? "#2563EB" : c.dim ? "#E0E3E8" : "#C9CDD4",
                      width: armed && !on ? "0%" : `${(c.pct / MAX_PCT) * 100}%`,
                      transition: `width 900ms cubic-bezier(0.22,1,0.36,1) ${i * 70}ms`,
                    }}
                  />
                </div>
                <span className={`text-[11px] sm:text-[13px] tabular-nums ${c.highlight ? "font-extrabold text-[#2563EB]" : c.dim ? "text-[#9AA1AB]" : "font-semibold text-[#0B0B0C]"}`}>
                  {c.display}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#8A8F98] leading-relaxed mt-5">
            Tasa de cierre promedio por canal de adquisición (meta-análisis de
            cientos de empresas). Leads comprados: promedio del sector asegurador.
          </p>
        </div>

        {/* Dona: de dónde vienen los clientes nuevos */}
        <div className="md:col-span-2 bg-[#F4F5F7] rounded-[20px] border border-[#ECEDEF] p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5 gap-3">
            <h3 className="font-bold text-[17px] text-[#0B0B0C]">De dónde vienen los clientes</h3>
          </div>
          <div className="flex items-center justify-center py-2 mb-5">
            <div
              className="relative rounded-full"
              style={{
                width: 168,
                height: 168,
                background: `conic-gradient(#2563EB 0 ${MIX[0].pct}%, #0B0B0C ${MIX[0].pct}% ${MIX[0].pct + MIX[1].pct}%, #C9CDD4 ${MIX[0].pct + MIX[1].pct}% 100%)`,
                opacity: armed && !on ? 0 : 1,
                transform: armed && !on ? "scale(0.85)" : "scale(1)",
                transition: "opacity 700ms ease 200ms, transform 700ms cubic-bezier(0.22,1,0.36,1) 200ms",
              }}
            >
              <div className="absolute rounded-full bg-[#F4F5F7]" style={{ inset: 38 }} />
            </div>
          </div>
          <p className="text-center text-[15px] text-[#5A626E] mb-5 leading-snug">
            <b className="text-[#0B0B0C] font-extrabold text-[19px]">6 de 10</b>{" "}
            clientes nuevos llegan por referidos
          </p>
          <div className="space-y-2 mb-5">
            {MIX.map((m) => (
              <div key={m.label} className="flex items-center gap-2 text-[13px]">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                <span className="text-[#5A626E] flex-1 leading-tight">{m.label}</span>
                <span className="font-bold text-[#0B0B0C] tabular-nums">{m.pct}%</span>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-4 border-t border-[#E4E6EA] space-y-2.5">
            <p className="text-xs text-[#8A8F98] leading-snug">
              <b className="text-[#0B0B0C]">92%</b> confía más en la recomendación
              de un conocido que en cualquier anuncio — Nielsen
            </p>
            <p className="text-xs text-[#8A8F98] leading-snug">
              <b className="text-[#0B0B0C]">16% más</b> vale un cliente referido a
              lo largo de su vida — Wharton
            </p>
            <p className="text-[11px] text-[#9AA1AB] leading-snug">
              Distribución estimada con encuestas del sector para asesores establecidos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
