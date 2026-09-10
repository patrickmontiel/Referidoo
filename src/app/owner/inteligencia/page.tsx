import { redirect } from "next/navigation";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { REAL_REFERRAL_WHERE, REAL_CLIENT_WHERE, safeRate } from "@/lib/analytics-scope";

// Inteligencia agregada de la plataforma.
//
// DATA TRUTH (ver 15-METRICS-DICTIONARY.md):
//  - Solo asesores reales (sin internos/QA) y referidos NO borrados.
//  - Se ELIMINÓ la comparación contra "industria 25.6% (Focus Digital 2025)":
//    era una constante sin ninguna fuente en el repo, y además medía otra cosa
//    que nuestra tasa (denominadores distintos). No se compara sin fuente.
//  - PRIVACIDAD: nunca nombres de clientes. Los referidores se muestran como
//    DISTRIBUCIÓN anónima, no como una lista de personas.
const DAY_MS = 24 * 60 * 60 * 1000;

export default async function OwnerInteligenciaPage() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) redirect("/login");

  const [referrals, clients] = await Promise.all([
    db.referral.findMany({
      where: REAL_REFERRAL_WHERE,
      select: {
        status: true,
        createdAt: true,
        updatedAt: true,
        convertedAt: true,
        contactedAt: true,
        saleAmount: true,
        productType: true,
        referrerId: true,
        rewardAmount: true,
        tierPosition: true,
      },
    }),
    db.client.findMany({
      where: REAL_CLIENT_WHERE,
      // Sin `name`: el owner no necesita la identidad de los clientes.
      select: { id: true },
    }),
  ]);

  const active = referrals.filter((r) => r.status !== "rejected");
  const converted = active.filter((r) => r.status === "converted");
  const closeRate = active.length > 0 ? (converted.length / active.length) * 100 : 0;

  // Días a cierre con la fecha INMUTABLE: antes usaba updatedAt, así que
  // validar una carátula meses después inflaba el promedio retroactivamente.
  // Los cierres sin convertedAt conocido se excluyen (no se inventa la fecha).
  const daysToClose = converted
    .filter((r) => r.convertedAt != null)
    .map((r) => (r.convertedAt!.getTime() - r.createdAt.getTime()) / DAY_MS)
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

  // FIX: antes el numerador salía de TODOS los referrerId (incluyendo clientes
  // inactivos o de asesores excluidos) y el denominador solo de clientes
  // activos → la tasa podía pasar de 100%. Ahora se intersecta con la MISMA
  // población del denominador.
  const clientIdSet = new Set(clients.map((c) => c.id));
  const sharers = new Set(active.map((r) => r.referrerId).filter((id) => clientIdSet.has(id)));
  const pctSharingRate = safeRate(sharers.size, clients.length);
  const pctSharing = pctSharingRate === null ? null : pctSharingRate * 100;

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

  // DISTRIBUCIÓN DE REFERIDORES (sin identidad).
  // Antes esto era una tabla "Top referidores" con NOMBRES de clientes — lo que
  // contradecía la promesa de la propia página. El owner necesita saber cómo se
  // reparte la producción, no quién es cada persona.
  const byReferrer = new Map<string, number>();
  for (const r of active) {
    byReferrer.set(r.referrerId, (byReferrer.get(r.referrerId) ?? 0) + 1);
  }
  const buckets = { uno: 0, dos: 0, tresCinco: 0, seisMas: 0 };
  for (const [, n] of byReferrer) {
    if (n >= 6) buckets.seisMas += 1;
    else if (n >= 3) buckets.tresCinco += 1;
    else if (n === 2) buckets.dos += 1;
    else buckets.uno += 1;
  }
  const referrerDistribution = [
    { label: "1 referido", count: buckets.uno },
    { label: "2 referidos", count: buckets.dos },
    { label: "3–5 referidos", count: buckets.tresCinco },
    { label: "6+ referidos", count: buckets.seisMas },
  ];
  const productiveReferrers = byReferrer.size;

  const nf = (n: number, d = 0) => n.toLocaleString("es-MX", { maximumFractionDigits: d });

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-[26px] font-bold text-brand-ink">Inteligencia</h1>
        <p className="text-sm text-brand-gray-4 mt-1">
          Agregados de la plataforma, solo de asesores reales. Sin identidad de clientes.
        </p>
      </div>

      {/* Tasa de cierre — SIN comparación contra "la industria": la constante
          anterior (25.6%) no tenía ninguna fuente en el repo y medía otra cosa. */}
      <div className="bg-brand-ink text-white rounded-2xl p-6">
        <p className="text-sm text-brand-gray-5 mb-4">Tasa de cierre de referidos</p>
        {active.length === 0 ? (
          <p className="text-sm text-brand-gray-5">Sin datos suficientes.</p>
        ) : (
          <div>
            <p className="text-[42px] font-bold leading-none">{nf(closeRate, 1)}%</p>
            <p className="text-sm text-brand-gray-5 mt-2">
              {converted.length} cerrados de {active.length} referidos no rechazados (incluye los que siguen abiertos)
            </p>
          </div>
        )}
        <p className="text-xs text-brand-gray-5 mt-4">
          Aún no hay suficiente volumen para comparar contra un benchmark de industria con fuente verificable.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-brand-border-1 p-5">
          <p className="text-sm text-brand-gray-3 mb-3">Cartera que ha referido</p>
          <p className="text-[34px] font-bold text-brand-ink leading-none mb-3">{pctSharing === null ? "—" : `${nf(pctSharing)}%`}</p>
          <p className="text-sm text-brand-gray-4">
            {clients.length === 0 ? "Sin datos suficientes" : `${sharers.size} de ${clients.length} clientes activos han generado al menos un referido`}
          </p>
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
        {/* Distribución de referidores — SIN identidad (antes era una tabla con
            nombres de clientes, que contradecía la promesa de esta página). */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-brand-border-1 p-6">
          <p className="font-bold text-brand-ink text-[15px] mb-1">Distribución de referidores</p>
          <p className="text-xs text-brand-gray-4 mb-3">
            Cómo se reparte la producción entre quienes ya refirieron. Agregado y anónimo — el dueño ve
            performance, no identidad de los clientes de sus asesores.
          </p>
          {productiveReferrers === 0 ? (
            <p className="text-sm text-brand-gray-4 py-4">Aún no hay referidores con actividad.</p>
          ) : (
            <div className="space-y-2.5">
              <p className="text-sm text-brand-gray-2 mb-3">
                <b className="text-brand-ink">{productiveReferrers}</b> clientes han generado al menos un referido
              </p>
              {referrerDistribution.map((b) => {
                const width = productiveReferrers > 0 ? Math.max(2, Math.round((b.count / productiveReferrers) * 100)) : 0;
                return (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="w-32 flex-shrink-0 text-sm text-brand-gray-2">{b.label}</span>
                    <span className="flex-1 h-7 bg-brand-surface rounded-lg overflow-hidden relative">
                      <span className="block h-full bg-[#2563EB]/15 rounded-lg" style={{ width: `${width}%` }} />
                      <span className="absolute inset-y-0 left-3 flex items-center text-sm font-bold text-brand-ink tabular-nums">{b.count}</span>
                    </span>
                  </div>
                );
              })}
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
