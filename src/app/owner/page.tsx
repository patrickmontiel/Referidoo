"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, LabelList, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";

type Overview = {
  monthLabel: string;
  periodLabel: string;
  mrr: number;
  mrrNew: number;
  proCount: number;
  freemiumCount: number;
  activeCount: number;
  commissionTotal: number;
  commissionSince: string;
  conversionsCount: number;
  salesValue: number;
  weekly: { label: string; commission: number; mrr: number }[];
  weeklyHasData: boolean;
  products: { type: string; commission: number; pct: number }[];
  ranking: { id: string; name: string; plan: string; leads: number; converted: number; commission: number; lastCloseAt: string | null; moroso?: boolean }[];
  problems: { id: string; title: string; detail: string }[];
  activity: { type: "conversion" | "payment" | "bubble" | "new" | "alert"; text: string; amount: number | null; date: string }[];
};

type Period = "month" | "90d" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "month", label: "Este mes" },
  { value: "90d", label: "90 días" },
  { value: "all", label: "Todo" },
];

const PIE_COLORS = ["#3b82f6", "#0a0a0a", "#9ca3af", "#93c5fd", "#d4d4d8"];

const barConfig = {
  commission: { label: "Comisión", color: "#3b82f6" },
  mrr: { label: "MRR", color: "#bfd3fb" },
} satisfies ChartConfig;

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function relTime(iso: string | null) {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "hoy";
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}

function activityDate(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return `hoy, ${d.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" })}`;
  if (days <= 5) return days === 1 ? "hace 1 día" : `hace ${days} días`;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");
}

function ActivityIcon({ type }: { type: Overview["activity"][number]["type"] }) {
  const glyph = {
    conversion: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    payment: <span className="text-[13px] font-bold">$</span>,
    bubble: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    ),
    new: <span className="text-[15px] font-bold leading-none">+</span>,
    alert: <span className="text-[13px] font-bold">!</span>,
  }[type];
  return (
    <div className="w-10 h-10 rounded-full bg-[#F4F5F7] text-[#3F4651] flex items-center justify-center flex-shrink-0">
      {glyph}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-brand-border-1 p-5 h-[130px] animate-pulse">
          <div className="h-3 w-24 bg-[#F4F5F7] rounded mb-4" />
          <div className="h-8 w-20 bg-[#F4F5F7] rounded" />
        </div>
      ))}
    </div>
  );
}

export default function OwnerResumenPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load(p: Period) {
    setLoading(true);
    setError(false);
    fetch(`/api/owner/overview?period=${p}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.mrr !== "number") throw new Error("respuesta inválida");
        setData(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(period), [period]);

  const topProduct = data?.products[0];

  return (
    <div className="space-y-4">
      {/* Título + periodo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-bold text-brand-ink">Resumen del negocio</h1>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`text-sm font-medium px-4 py-2 rounded-full transition ${
                period === p.value
                  ? "bg-brand-ink text-white"
                  : "bg-white text-[#3F4651] border border-brand-border-4 hover:bg-brand-surface"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <StatSkeleton />}

      {!loading && error && (
        <div className="bg-white rounded-2xl border border-brand-border-1 p-6 flex items-center justify-between">
          <p className="text-sm text-brand-gray-4">No se pudo cargar el resumen.</p>
          <button onClick={() => load(period)} className="text-sm font-medium text-brand-ink hover:underline">
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Stat cards — GWP referido es la North Star, siempre primero */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-brand-ink text-white rounded-2xl p-5">
              <p className="text-sm text-brand-gray-5 mb-3">
                Prima referida · GWP ({period === "month" ? "este mes" : period === "90d" ? "90 días" : "todo"})
              </p>
              <p className="text-[34px] font-bold leading-none mb-3">{formatCurrency(data.salesValue)}</p>
              <p className="text-sm text-brand-gray-5">
                {data.conversionsCount} póliza{data.conversionsCount !== 1 ? "s" : ""} cerrada{data.conversionsCount !== 1 ? "s" : ""} vía Referidoo
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-brand-border-1 p-5">
              <p className="text-sm text-brand-gray-3 mb-3">Comisión Referidoo</p>
              <p className="text-[34px] font-bold text-brand-ink leading-none mb-3">{formatCurrency(data.commissionTotal)}</p>
              <p className="text-sm text-brand-gray-4">{data.periodLabel}</p>
            </div>
            <div className="bg-white rounded-2xl border border-brand-border-1 p-5">
              <p className="text-sm text-brand-gray-3 mb-3">MRR (suscripciones)</p>
              <p className="text-[34px] font-bold text-brand-ink leading-none mb-3">{formatCurrency(data.mrr)}</p>
              <p className="text-sm text-brand-gray-4">
                {data.mrrNew > 0 && <span className="text-green-600 font-semibold">▲ +{formatCurrency(data.mrrNew)} · </span>}
                {data.proCount} asesor{data.proCount !== 1 ? "es" : ""} en Pro
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-brand-border-1 p-5">
              <p className="text-sm text-brand-gray-3 mb-3">Asesores activos</p>
              <p className="text-[34px] font-bold text-brand-ink leading-none mb-3">{data.activeCount}</p>
              <p className="text-sm text-brand-gray-4">
                <span className="text-green-600 font-semibold">{data.proCount} Pro</span> · {data.freemiumCount} freemium
              </p>
            </div>
          </div>

          {/* Gráficas */}
          <div className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 bg-white rounded-2xl border border-brand-border-1 p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="font-bold text-brand-ink text-[15px]">
                  Comisión generada por {period === "all" ? "mes" : "semana"}
                </p>
                <div className="flex items-center gap-4 text-xs text-brand-gray-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" /> Comisión
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#bfd3fb]" /> MRR
                  </span>
                </div>
              </div>
              {data.weeklyHasData ? (
                <ChartContainer config={barConfig} className="aspect-auto h-[240px] w-full">
                  <BarChart data={data.weekly} margin={{ top: 24, left: 4, right: 4 }}>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="#8A8F98" interval={0} />
                    <Bar dataKey="commission" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={44}>
                      <LabelList
                        dataKey="commission"
                        position="top"
                        formatter={(v: unknown) => {
                          const n = Number(v);
                          return n > 0 ? formatCurrency(n) : "";
                        }}
                        style={{ fill: "#0B0B0C", fontSize: 12, fontWeight: 700 }}
                      />
                    </Bar>
                    <Bar dataKey="mrr" fill="#bfd3fb" radius={[6, 6, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center">
                  <p className="text-sm text-brand-gray-4">Aún no hay comisión registrada en este periodo.</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-brand-border-1 p-6">
              <p className="font-bold text-brand-ink text-[15px] mb-5">Comisión por tipo de producto</p>
              {data.products.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center">
                  <p className="text-sm text-brand-gray-4">Sin comisión en este periodo.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-6">
                    <div className="relative w-[150px] h-[150px] flex-shrink-0">
                      <PieChart width={150} height={150}>
                        <Pie
                          data={data.products}
                          dataKey="commission"
                          nameKey="type"
                          innerRadius={48}
                          outerRadius={72}
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {data.products.map((p, i) => (
                            <Cell key={p.type} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="font-bold text-brand-ink text-[17px] leading-none">{formatCurrency(data.commissionTotal)}</span>
                        <span className="text-[11px] text-brand-gray-4 mt-0.5">total</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2.5 min-w-0">
                      {data.products.map((p, i) => (
                        <div key={p.type} className="flex items-center gap-2 text-sm">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-[#3F4651] truncate flex-1">{p.type}</span>
                          <span className="font-bold text-brand-ink">{formatCurrency(p.commission)}</span>
                          <span className="text-brand-gray-4 w-9 text-right">{p.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {topProduct && topProduct.pct >= 60 && (
                    <p className="text-sm text-brand-gray-4 mt-5 pt-4 border-t border-brand-border-1 leading-relaxed">
                      {topProduct.type} domina el mix — {topProduct.pct}% de la comisión viene de un solo producto.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Ranking */}
          <div className="bg-white rounded-2xl border border-brand-border-1 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-brand-ink text-[15px]">
                Ranking de asesores ({period === "month" ? "este mes" : period === "90d" ? "90 días" : "todo"})
              </p>
              <Link href="/owner/asesores" className="text-sm font-medium text-[#2563EB] hover:underline">
                Ver todos →
              </Link>
            </div>
            {data.ranking.length === 0 ? (
              <p className="text-sm text-brand-gray-4 py-6">Todavía no hay asesores registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 640 }}>
                  <thead>
                    <tr className="text-left text-[11px] font-bold uppercase tracking-[0.08em] text-brand-gray-4">
                      <th className="py-3 pr-2 font-bold w-8">#</th>
                      <th className="py-3 pr-4 font-bold">Asesor</th>
                      <th className="py-3 pr-4 font-bold">Plan</th>
                      <th className="py-3 pr-4 font-bold text-right">Leads</th>
                      <th className="py-3 pr-4 font-bold text-right">Convertidos</th>
                      <th className="py-3 pr-4 font-bold text-right">Comisión</th>
                      <th className="py-3 font-bold text-right">Último cierre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border-1">
                    {data.ranking.map((row, i) => (
                      <tr key={row.id}>
                        <td className="py-3.5 pr-2 text-brand-gray-4">{i + 1}</td>
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                i === 0 && row.commission > 0 ? "bg-[#2563EB] text-white" : "bg-[#F4F5F7] text-[#3F4651]"
                              }`}
                            >
                              {getInitials(row.name)}
                            </div>
                            <span className="font-semibold text-brand-ink whitespace-nowrap">{row.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                                row.plan === "paid" ? "bg-[#EBF2FF] text-[#2563EB]" : "bg-[#F4F5F7] text-[#6B727D]"
                              }`}
                            >
                              {row.plan === "paid" ? "Pro" : "Freemium"}
                            </span>
                            {row.moroso && (
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap bg-red-50 text-red-600">
                                Premio vencido
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-right text-brand-ink">{row.leads}</td>
                        <td className="py-3.5 pr-4 text-right text-brand-ink">{row.converted}</td>
                        <td className="py-3.5 pr-4 text-right font-bold text-brand-ink">{formatCurrency(row.commission)}</td>
                        <td className="py-3.5 text-right text-brand-gray-4 whitespace-nowrap">{relTime(row.lastCloseAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Problemas + Actividad */}
          <div className="grid lg:grid-cols-5 gap-4 items-start">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-brand-border-1 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-brand-ink text-[15px]">Problemas operativos</p>
                {data.problems.length > 0 && (
                  <span className="text-xs font-semibold text-[#6B727D] bg-[#F4F5F7] px-2.5 py-1 rounded-full">
                    {data.problems.length} pendiente{data.problems.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {data.problems.length === 0 ? (
                <p className="text-sm text-brand-gray-4">Sin problemas pendientes — todo en orden.</p>
              ) : (
                <div className="space-y-3">
                  {data.problems.map((p) => (
                    <div key={p.id} className="bg-[#F4F5F7] rounded-xl p-4">
                      <p className="text-sm font-bold text-brand-ink flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-ink flex-shrink-0 mt-[7px]" />
                        {p.title}
                      </p>
                      <p className="text-[13px] text-brand-gray-3 mt-1 pl-3.5 leading-relaxed">{p.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-3 bg-white rounded-2xl border border-brand-border-1 p-6">
              <p className="font-bold text-brand-ink text-[15px] mb-2">Actividad reciente</p>
              {data.activity.length === 0 ? (
                <p className="text-sm text-brand-gray-4 py-4">Sin actividad todavía.</p>
              ) : (
                <div className="divide-y divide-brand-border-1">
                  {data.activity.map((a, i) => (
                    <div key={i} className="flex items-center gap-3.5 py-3.5">
                      <ActivityIcon type={a.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-brand-ink leading-snug">{a.text}</p>
                        <p className="text-xs text-brand-gray-4 mt-0.5">{activityDate(a.date)}</p>
                      </div>
                      {a.amount !== null && (
                        <span className="font-bold text-brand-ink whitespace-nowrap">
                          {a.amount > 0 ? `+${formatCurrency(a.amount)}` : formatCurrency(0)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
