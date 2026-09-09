import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { aggregateFunnel, perAdvisorFunnel } from "@/lib/activation-funnel";
import { ActivacionTable } from "./ActivacionTable";

// Cockpit de activación: ¿dónde se muere el loop de dos lados?
// client_created → portal_link_sent → client_portal_opened →
// referral_share_clicked → referral_landing_viewed → referral_form_started →
// referral_created. Solo lectura, owner-only. Sin gráficas: diagnóstico.

const STEPS = [
  { key: "client_created", label: "Clientes creados" },
  { key: "portal_link_sent", label: "Acciones de envío de link" },
  { key: "client_portal_opened", label: "Portales abiertos" },
  { key: "referral_share_clicked", label: "Acciones de compartir" },
  { key: "referral_landing_viewed", label: "Vistas de landing" },
  { key: "referral_form_started", label: "Formularios iniciados" },
  { key: "referral_created", label: "Referidos creados" },
] as const;

// Conversión entre pasos SOLO donde el denominador aplica limpio.
// (Un cliente puede recibir varias acciones de envío; una vista de landing no
// tiene denominador limpio porque 1 share genera varias vistas.)
const CLEAN_CONVERSION: Record<string, string> = {
  client_portal_opened: "client_created", // tasa de apertura por cliente
  referral_form_started: "referral_landing_viewed",
  referral_created: "referral_form_started",
};

const PERIODS = [
  { key: "30", label: "30 días" },
  { key: "90", label: "90 días" },
  { key: "all", label: "Todo" },
];

export default async function OwnerActivacionPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) redirect("/login");

  const { period = "30" } = await searchParams;
  const since =
    period === "all" ? new Date(0) : new Date(Date.now() - Number(period === "90" ? 90 : 30) * 24 * 60 * 60 * 1000);

  const [events, advisors] = await Promise.all([
    db.productEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { event: true, advisorId: true },
    }),
    db.advisor.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
  ]);

  // Agregado global + por asesor (funciones puras, testeadas en activation-funnel.test.ts).
  const agg = aggregateFunnel(events);
  const perAdvisor = perAdvisorFunnel(events);

  const nameById = new Map(advisors.map((a) => [a.id, a.name]));
  const rows = [...perAdvisor.entries()]
    .map(([advisorId, counts]) => ({ advisorId, name: nameById.get(advisorId) ?? "—", counts }))
    .filter((r) => STEPS.some((s) => r.counts[s.key] > 0))
    .sort((a, b) => b.counts.client_created - a.counts.client_created || b.counts.referral_created - a.counts.referral_created);

  // Solo mostramos % cuando es una tasa real (num ≤ den). Los eventos de cliente
  // son best-effort (se pueden perder por adblock/red), así que el denominador
  // puede quedar subcontado; un % >100% sería engañoso → en ese caso mostramos "—".
  const pct = (num: number, den: number) => (den > 0 && num <= den ? Math.round((num / den) * 100) : null);

  return (
    <div className="w-full max-w-[1100px]">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Activación</h1>
          <p className="text-sm text-brand-gray-4 mt-0.5">¿Dónde se está muriendo el loop cliente → referido?</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/owner/activacion?period=${p.key}`}
              className={`text-sm px-3.5 py-2 rounded-full border transition ${
                period === p.key ? "bg-brand-ink text-white border-brand-ink" : "bg-white text-brand-gray-2 border-brand-border-4 hover:bg-brand-surface"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Funnel agregado */}
      <div className="bg-white rounded-2xl border border-brand-border-1 p-5 mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-gray-3 mb-4">Funnel agregado</p>
        <div className="space-y-2.5">
          {STEPS.map((s, i) => {
            const count = agg[s.key];
            const denKey = CLEAN_CONVERSION[s.key];
            const conv = denKey ? pct(count, agg[denKey]) : null;
            const maxCount = agg[STEPS[0].key] || 1;
            const widthPct = Math.max(4, Math.round((count / maxCount) * 100));
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className="w-44 flex-shrink-0 text-sm text-brand-gray-2">
                  <span className="text-brand-gray-4 tabular-nums mr-1.5">{i + 1}.</span>{s.label}
                </div>
                <div className="flex-1 h-8 bg-brand-surface rounded-lg overflow-hidden relative">
                  <div className="h-full bg-[#2563EB]/15 rounded-lg" style={{ width: `${widthPct}%` }} />
                  <span className="absolute inset-y-0 left-3 flex items-center text-sm font-bold text-brand-ink tabular-nums">{count}</span>
                </div>
                <div className="w-20 flex-shrink-0 text-right text-sm tabular-nums">
                  {conv !== null ? (
                    <span className="text-[#2563EB] font-semibold">{conv}%</span>
                  ) : (
                    <span className="text-brand-gray-4">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-brand-gray-4 mt-4 leading-relaxed">
          El % es la conversión desde el paso anterior <b>solo donde el denominador aplica limpio</b> (apertura/cliente, forma/vista, referido/forma).
          En los demás pasos se muestra el conteo: una acción de envío puede repetirse por cliente, y una vista de landing puede venir de varios shares (no es un lead único).
          Si un % saliera &gt;100% (el denominador quedó subcontado porque los eventos de cliente son best-effort), se muestra <b>—</b> en vez de un número engañoso.
        </p>
      </div>

      {/* Funnel por asesor + drilldown */}
      <div className="bg-white rounded-2xl border border-brand-border-1 overflow-hidden">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-gray-3 px-5 pt-5 pb-1">Por asesor</p>
        {rows.length === 0 ? (
          <p className="text-sm text-brand-gray-4 px-5 py-8 text-center">Sin eventos de activación en este periodo.</p>
        ) : (
          <ActivacionTable rows={rows} steps={STEPS.map((s) => ({ key: s.key, label: s.label }))} />
        )}
      </div>
    </div>
  );
}
