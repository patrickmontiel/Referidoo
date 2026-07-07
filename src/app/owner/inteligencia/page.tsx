import { redirect } from "next/navigation";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

// Grafo v0: la inteligencia agregada de la plataforma. Cada número de esta
// página es (1) un benchmark que ninguna aseguradora tiene a nivel asesor
// individual y (2) materia prima del Loop 3 (contenido/autoridad). A escala,
// esto se convierte en el producto de datos — agregado y anónimo hacia
// afuera, nunca datos personales.
const INDUSTRY_CLOSE_RATE = 25.6; // Focus Digital 2025 — referidos, promedio multisector

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function OwnerInteligenciaPage() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) redirect("/login");

  const [referrals, clients] = await Promise.all([
    db.referral.findMany({
      where: { advisor: { deletedAt: null } },
      select: {
        status: true,
        createdAt: true,
        updatedAt: true,
        contactedAt: true,
        saleAmount: true,
        productType: true,
        referrerId: true,
        rewardAmount: true,
        tierPosition: true,
      },
    }),
    db.client.findMany({
      where: { active: true, advisor: { deletedAt: null } },
      select: { id: true, name: true, advisor: { select: { name: true } } },
    }),
  ]);

  const active = referrals.filter((r) => r.status !== "rejected");
  const converted = active.filter((r) => r.status === "converted");
  const closeRate = active.length > 0 ? (converted.length / active.length) * 100 : 0;

  const daysToClose = converted
    .map((r) => (r.updatedAt.getTime() - r.createdAt.getTime()) / DAY_MS)
    .filter((d) => d >= 0);
  const avgDays = daysToClose.length
    ? daysToClose.reduce((s, d) => s + d, 0) / daysToClose.length
    : null;

  // Horas a primer contacto (métrica del Playbook 2: meta <24h)
  const hoursToContact = active
    .filter((r) => r.contactedAt)
    .map((r) => (r.contactedAt!.getTime() - r.createdAt.getTime()) / (60 * 60 * 1000))
    .filter((h) => h >= 0);
  const avgHoursContact = hoursToContact.length
    ? hoursToContact.reduce((s, h) => s + h, 0) / hoursToContact.length
    : null;

  const sharers = new Set(active.map((r) => r.referrerId));
  const pctSharing = clients.length > 0 ? (sharers.size / clients.length) * 100 : 0;

  const withSale = converted.filter((r) => r.saleAmount);
  const gwp = withSale.reduce((s, r) => s + (r.saleAmount ?? 0), 0);
  const avgPrima = withSale.length ? gwp / withSale.length : null;

  // Mix por producto (conversiones)
  const mix = new Map<string, { count: number; gwp: number }>();
  for (const r of converted) {
    const key = r.productType ?? "Sin producto";
    const prev = mix.get(key) ?? { count: 0, gwp: 0 };
    mix.set(key, { count: prev.count + 1, gwp: prev.gwp + (r.saleAmount ?? 0) });
  }
  const mixRows = [...mix.entries()]
    .map(([product, v]) => ({ product, ...v }))
    .sort((a, b) => b.count - a.count);

  // Top referidores (los nodos más valiosos del grafo)
  const byReferrer = new Map<string, { referidos: number; conversiones: number; premios: number }>();
  for (const r of active) {
    const prev = byReferrer.get(r.referrerId) ?? { referidos: 0, conversiones: 0, premios: 0 };
    prev.referidos += 1;
    if (r.status === "converted") {
      prev.conversiones += 1;
      if (r.tierPosition > 0) prev.premios += r.rewardAmount;
    }
    byReferrer.set(r.referrerId, prev);
  }
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const topReferrers = [...byReferrer.entries()]
    .map(([clientId, v]) => ({
      name: clientById.get(clientId)?.name ?? "(cliente dado de baja)",
      advisorName: clientById.get(clientId)?.advisor.name ?? "—",
      ...v,
    }))
    .sort((a, b) => b.conversiones - a.conversiones || b.referidos - a.referidos)
    .slice(0, 8);

  const nf = (n: number, d = 0) => n.toLocaleString("es-MX", { maximumFractionDigits: d });

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-[26px] font-bold text-brand-ink">Inteligencia</h1>
        <p className="text-sm text-brand-gray-4 mt-1">
          Grafo v0 — los benchmarks agregados de la plataforma. Cada número de aquí es contenido
          para el Loop 3 y la semilla del producto de datos.
        </p>
      </div>

      {/* Benchmark hero: nuestra tasa vs la industria */}
      <div className="bg-brand-ink text-white rounded-2xl p-6">
        <p className="text-sm text-brand-gray-5 mb-4">Tasa de cierre de referidos en Referidoo vs. industria</p>
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="text-[42px] font-bold leading-none">{nf(closeRate, 1)}%</p>
            <p className="text-sm text-brand-gray-5 mt-2">nuestra plataforma ({converted.length} de {active.length} referidos)</p>
          </div>
          <div>
            <p className="text-[42px] font-bold leading-none text-[#93b4fb]">{INDUSTRY_CLOSE_RATE}%</p>
            <p className="text-sm text-brand-gray-5 mt-2">promedio de la industria (Focus Digital 2025)</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-brand-border-1 p-5">
          <p className="text-sm text-brand-gray-3 mb-3">Cartera que comparte</p>
          <p className="text-[34px] font-bold text-brand-ink leading-none mb-3">{nf(pctSharing)}%</p>
          <p className="text-sm text-brand-gray-4">{sharers.size} de {clients.length} clientes activos han referido</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-border-1 p-5">
          <p className="text-sm text-brand-gray-3 mb-3">Días a cierre (aprox.)</p>
          <p className="text-[34px] font-bold text-brand-ink leading-none mb-3">{avgDays !== null ? nf(avgDays, 1) : "—"}</p>
          <p className="text-sm text-brand-gray-4">
            {avgHoursContact !== null
              ? `primer contacto: ${nf(avgHoursContact, 1)} h promedio (meta <24 h)`
              : "primer contacto: sin datos aún"}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-border-1 p-5">
          <p className="text-sm text-brand-gray-3 mb-3">Prima promedio referida</p>
          <p className="text-[34px] font-bold text-brand-ink leading-none mb-3">{avgPrima !== null ? formatCurrency(Math.round(avgPrima)) : "—"}</p>
          <p className="text-sm text-brand-gray-4">{withSale.length} pólizas con monto</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-border-1 p-5">
          <p className="text-sm text-brand-gray-3 mb-3">GWP referido (histórico)</p>
          <p className="text-[34px] font-bold text-brand-ink leading-none mb-3">{formatCurrency(gwp)}</p>
          <p className="text-sm text-brand-gray-4">prima total que ha fluido por el riel</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-4 items-start">
        {/* Top referidores */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-brand-border-1 p-6">
          <p className="font-bold text-brand-ink text-[15px] mb-1">Top referidores — los nodos del grafo</p>
          <p className="text-xs text-brand-gray-4 mb-3">Quiénes mueven el canal. A escala, esto se vuelve scoring de referidores.</p>
          {topReferrers.length === 0 ? (
            <p className="text-sm text-brand-gray-4 py-4">Aún no hay referidores con actividad.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 460 }}>
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-[0.08em] text-brand-gray-4">
                    <th className="py-2.5 pr-4 font-bold">Cliente</th>
                    <th className="py-2.5 pr-4 font-bold">Asesor</th>
                    <th className="py-2.5 pr-4 font-bold text-right">Referidos</th>
                    <th className="py-2.5 pr-4 font-bold text-right">Cierres</th>
                    <th className="py-2.5 font-bold text-right">Premios ganados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border-1">
                  {topReferrers.map((t) => (
                    <tr key={`${t.name}-${t.advisorName}`}>
                      <td className="py-3 pr-4 font-semibold text-brand-ink whitespace-nowrap">{t.name}</td>
                      <td className="py-3 pr-4 text-brand-gray-3 whitespace-nowrap">{t.advisorName}</td>
                      <td className="py-3 pr-4 text-right text-brand-ink">{t.referidos}</td>
                      <td className="py-3 pr-4 text-right font-bold text-brand-ink">{t.conversiones}</td>
                      <td className="py-3 text-right text-brand-ink">{formatCurrency(t.premios)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mix por producto */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-brand-border-1 p-6">
          <p className="font-bold text-brand-ink text-[15px] mb-3">Mix por producto (cierres)</p>
          {mixRows.length === 0 ? (
            <p className="text-sm text-brand-gray-4 py-4">Sin conversiones todavía.</p>
          ) : (
            <div className="divide-y divide-brand-border-1">
              {mixRows.map((m) => (
                <div key={m.product} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-ink">{m.product}</p>
                    <p className="text-xs text-brand-gray-4">{m.count} cierre{m.count !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="font-bold text-brand-ink text-sm">{formatCurrency(m.gwp)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-brand-gray-5 mt-4 leading-relaxed">
            Con pocos datos los porcentajes saltan — se estabilizan con volumen. Hacia afuera solo
            se publican agregados anónimos, nunca datos personales (regla del aviso de privacidad).
          </p>
        </div>
      </div>
    </div>
  );
}
