"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Count } from "./Count";

/* La matemática de referidos: cifras ilustrativas que cuentan al entrar en
   viewport + gráfica SVG que se dibuja sola. Sin JS o con reduced-motion
   todo es visible y estático desde el primer render. */

const DATA = [2, 5, 9, 13, 17, 22, 26, 31, 36, 40, 45, 50];
const W = 340;
const H = 170;
const PX = 12;
const PT = 30;
const PB = 26;

function points() {
  const max = DATA[DATA.length - 1];
  return DATA.map(
    (v, i) =>
      [
        PX + (i * (W - 2 * PX)) / (DATA.length - 1),
        H - PB - (v / max) * (H - PT - PB),
      ] as const
  );
}

const STEPS = [
  { n: 25, unit: "clientes", body: "en tu cartera, cada uno con su propio link de referidos", blue: false },
  { n: 50, unit: "referidos al año", body: "con que cada cliente te mande solo 2", blue: false },
  { n: 15, unit: "pólizas nuevas", body: "cerrando 3 de cada 10 — sin comprar un solo lead", blue: true },
];

export function ReferralMath() {
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
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const p = points();
  const line = p.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = `${line} L${p[p.length - 1][0]},${H - PB} L${p[0][0]},${H - PB} Z`;
  const [lx, ly] = p[p.length - 1];

  return (
    <section ref={ref} className="bg-[#0B0B0C]">
      <div className="max-w-[1180px] mx-auto px-8 py-20 grid md:grid-cols-2 gap-14 items-center">
        <div>
          <h2
            className="font-extrabold tracking-[-0.028em] text-white mb-4 text-balance"
            style={{ fontSize: "clamp(1.75rem, 4vw, 39px)" }}
          >
            Tu cartera ya trae tus próximas ventas
          </h2>
          <p className="text-[#9098A2] leading-[1.65] mb-9" style={{ fontSize: 17 }}>
            No necesitas más leads fríos. Necesitas que tus clientes de hoy te
            presenten a los de mañana — y que eso pase solo, sin perseguir a nadie.
          </p>

          <div className="mb-8">
            {STEPS.map((s, i) => (
              <div key={s.unit}>
                {i > 0 && (
                  <div className="pl-7 py-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 4V20M12 20L6 14M12 20L18 14" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <div className="flex items-baseline gap-4">
                  <span
                    className={`font-extrabold tracking-[-0.02em] tabular-nums text-right ${s.blue ? "text-[#3B82F6]" : "text-white"}`}
                    style={{ fontSize: 44, minWidth: 78, lineHeight: 1 }}
                  >
                    <Count to={s.n} run={on} duration={900} delay={i * 160} />
                  </span>
                  <span className="text-[15px] leading-snug text-[#9098A2]">
                    <b className="text-white font-bold">{s.unit}</b> — {s.body}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs leading-relaxed mb-8" style={{ color: "rgba(255,255,255,.38)" }}>
            Cifras ilustrativas para que hagas tu propia cuenta — y el supuesto
            de cierre es conservador: los referidos cierran ~26% en promedio,
            el mejor canal que existe.
          </p>

          <div className="flex items-center gap-4">
            <Link
              href="/registro"
              className="text-sm font-semibold bg-white text-[#0B0B0C] px-6 py-3 rounded-full transition-[background-color,transform] duration-150 hover:bg-white/90 active:scale-[0.97]"
            >
              Crear cuenta gratis
            </Link>
            <span className="text-xs text-[#9098A2]">Sin tarjeta para empezar</span>
          </div>
        </div>

        <div className="bg-white/[0.05] border border-white/10 rounded-[20px] p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-bold text-white">Referidos acumulados</p>
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.08em]">Ejemplo</span>
          </div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            role="img"
            aria-label="Gráfica ilustrativa: referidos acumulados creciendo de 2 a 50 en doce meses"
          >
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={f}
                x1={PX}
                x2={W - PX}
                y1={PT + f * (H - PT - PB)}
                y2={PT + f * (H - PT - PB)}
                stroke="rgba(255,255,255,.07)"
                strokeWidth="1"
              />
            ))}
            <path
              d={area}
              fill="rgba(59,130,246,.16)"
              style={{ opacity: armed ? (on ? 1 : 0) : 1, transition: "opacity 800ms ease 1100ms" }}
            />
            <path
              d={line}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              style={{
                strokeDasharray: 1,
                strokeDashoffset: armed ? (on ? 0 : 1) : 0,
                transition: "stroke-dashoffset 1600ms cubic-bezier(0.22,1,0.36,1) 150ms",
              }}
            />
            <g style={{ opacity: armed ? (on ? 1 : 0) : 1, transition: "opacity 400ms ease 1400ms" }}>
              <circle cx={lx} cy={ly} r="9" fill="rgba(59,130,246,.25)" className="chart-ping" />
              <circle cx={lx} cy={ly} r="4" fill="#3B82F6" stroke="#0B0B0C" strokeWidth="2" />
              <text x={lx - 10} y={ly - 12} textAnchor="end" fill="#ffffff" fontSize="12" fontWeight="700">
                50 referidos
              </text>
            </g>
            <text x={PX} y={H - 8} fill="rgba(255,255,255,.35)" fontSize="10">
              Mes 1
            </text>
            <text x={W - PX} y={H - 8} fill="rgba(255,255,255,.35)" fontSize="10" textAnchor="end">
              Mes 12
            </text>
          </svg>
          <p className="text-xs text-[#9098A2] leading-relaxed mt-4">
            Cada cliente comparte su link una vez — y su red trabaja para ti
            todos los meses, mientras Referidoo registra y calcula todo solo.
          </p>
        </div>
      </div>

    </section>
  );
}
