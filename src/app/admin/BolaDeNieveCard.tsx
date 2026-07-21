"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

// ── Supuestos de la proyección (AJUSTABLES) ──────────────────────────────────
// Son estimaciones conservadoras, no promesas. Patrick: si tus números reales
// de comisión o cierre son otros, cámbialos aquí — es lo único que hay que tocar.
const REFERRALS_PER_CLIENT_6MO = 0.5;   // referidos que manda un cliente en 6 meses si se le pide
const CLOSE_RATE = 0.26;                // ~26%, alineado a la investigación citada en la landing (ReferralMath)
const AVG_COMMISSION_PER_CLOSE = 13000; // comisión promedio del asesor por póliza cerrada (MXN)
const DEFAULT_PRIZE_PER_CLOSE = 1500;   // premio promedio que el asesor paga al que refirió
const HORIZON_MONTHS = 6;

// Forma de la curva: fracción del ingreso de 6 meses acumulada mes a mes.
// Arranca lento (los referidos tardan en llegar y cerrar) y acelera.
const CUMULATIVE_SHAPE = [0.06, 0.14, 0.3, 0.52, 0.8, 1];

type Props = {
  initialClientCount: number;
  avgPrizePerClose?: number;
};

export default function BolaDeNieveCard({ initialClientCount, avgPrizePerClose }: Props) {
  // Prellenamos con el conteo real; si es nuevo (0), un default motivador que
  // puede ajustar. Un solo campo: sin subir libro, sin captura.
  const [clients, setClients] = useState(initialClientCount > 0 ? initialClientCount : 50);
  const [showHow, setShowHow] = useState(false);

  const prize = avgPrizePerClose && avgPrizePerClose > 0 ? avgPrizePerClose : DEFAULT_PRIZE_PER_CLOSE;

  const referrals = Math.round(clients * REFERRALS_PER_CLIENT_6MO);
  const closes = Math.round(referrals * CLOSE_RATE);
  const commission = closes * AVG_COMMISSION_PER_CLOSE;
  const prizes = closes * prize;

  return (
    <div className="mb-5">
      <h2 className="font-bold text-[18px] text-[#0B0B0C] tracking-[-0.02em]">Tu bola de nieve</h2>
      <p className="text-[13px] text-brand-gray-3 mb-3">
        Lo que hoy es invisible, a la vista: cuánto crece esto si tus clientes refieren a su ritmo normal.
      </p>

      <div className="bg-white rounded-2xl border border-brand-border-1 p-1.5">
        <div className="grid md:grid-cols-[1.1fr_1fr] gap-1.5">
          {/* Izquierda: número héroe + desglose */}
          <div className="p-5">
            <div className="text-[clamp(2rem,7vw,42px)] font-extrabold tracking-[-0.03em] leading-none tabular-nums">
              ~<span className="text-[#2563EB]">{formatCurrency(commission)}</span>
            </div>
            <p className="text-[13px] text-brand-gray-3 mt-2 max-w-[30ch]">
              de ingreso estimado en {HORIZON_MONTHS} meses, con tus{" "}
              <span className="font-semibold text-[#0B0B0C]">{clients}</span> clientes.
            </p>

            {/* Campo: # de clientes */}
            <div className="mt-4">
              <label className="text-[11px] font-bold uppercase tracking-[0.05em] text-brand-gray-4">
                ¿Cuántos clientes tienes?
              </label>
              <div className="flex items-center gap-3 mt-1.5">
                <input
                  type="range"
                  min={1}
                  max={300}
                  value={clients}
                  onChange={(e) => setClients(Number(e.target.value))}
                  className="flex-1 accent-[#2563EB]"
                  aria-label="Número de clientes"
                />
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={clients}
                  onChange={(e) => setClients(Math.max(0, Number(e.target.value)))}
                  className="w-16 text-sm font-semibold text-[#0B0B0C] text-center border border-brand-border-4 rounded-lg py-1.5 tabular-nums focus:outline-none focus:border-[#2563EB]"
                  aria-label="Número de clientes"
                />
              </div>
            </div>

            {/* Desglose */}
            <div className="mt-5 flex flex-col gap-2">
              <Break dot="#2563EB" label="Referidos que cierran (est.)" value={`~${closes}`} />
              <Break dot="#1F9D5B" label="Tu comisión por esas ventas" value={`~${formatCurrency(commission)}`} />
              <Break dot="#8A8F98" label="Premios a repartir a clientes" value={`~${formatCurrency(prizes)}`} />
            </div>
          </div>

          {/* Derecha: barras 6 meses */}
          <div className="p-5 md:border-l border-t md:border-t-0 border-brand-border-1 flex flex-col">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-brand-gray-4 mb-3.5">
              Ingreso acumulado · {HORIZON_MONTHS} meses
            </p>
            <div className="flex-1 grid grid-cols-6 gap-2 items-end min-h-[130px]">
              {CUMULATIVE_SHAPE.map((frac, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className="w-full max-w-[26px] rounded-t-[6px] rounded-b-[3px]"
                    style={{
                      height: `${Math.max(6, frac * 100)}%`,
                      background: i < 2 ? "#EEF3FE" : "linear-gradient(#2563EB, #5b8bf3)",
                    }}
                  />
                  <span className="text-[10.5px] text-brand-gray-4 font-semibold">M{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transparencia */}
        <div className="px-4 pb-3 pt-1">
          <button
            onClick={() => setShowHow((v) => !v)}
            className="text-[12px] font-medium text-[#2563EB] bg-transparent border-0 p-0 cursor-pointer hover:underline"
          >
            {showHow ? "Ocultar cómo se calcula" : "Cómo se calcula"}
          </button>
          {showHow && (
            <p className="text-[12px] text-brand-gray-4 leading-relaxed mt-2">
              Estimación, no una promesa. Partimos de que cada cliente manda ~{REFERRALS_PER_CLIENT_6MO} referidos
              en {HORIZON_MONTHS} meses si se le pide, que ~{Math.round(CLOSE_RATE * 100)}% cierra (los referidos
              cierran mucho mejor que un lead frío), con una comisión promedio de {formatCurrency(AVG_COMMISSION_PER_CLOSE)}{" "}
              por venta y un premio de {formatCurrency(prize)} por referido cerrado. Tus números reales mandan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Break({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-brand-gray-2 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dot }} />
        {label}
      </span>
      <span className="font-bold text-[#0B0B0C] tabular-nums">{value}</span>
    </div>
  );
}
