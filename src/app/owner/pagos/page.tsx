import { redirect } from "next/navigation";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";
import { formatCurrency, formatDate } from "@/lib/utils";

const EVENT_LABEL: Record<string, { label: string; cls: string }> = {
  activated: { label: "Suscripción activada", cls: "bg-green-50 text-green-700" },
  failed: { label: "Cobro rechazado", cls: "bg-red-50 text-red-600" },
  cancelled: { label: "Cancelación", cls: "bg-[#F4F5F7] text-[#6B727D]" },
};

export default async function OwnerPagosPage() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) redirect("/login");

  const [proAdvisors, pendingCommissions, planEvents] = await Promise.all([
    db.advisor.findMany({
      where: { plan: "paid", deletedAt: null },
      select: { id: true, name: true, email: true, paidUntil: true, paymentFailedAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.referral.findMany({
      where: { billedAt: null, lessioCommission: { not: null }, advisor: { deletedAt: null } },
      select: { advisorId: true, lessioCommission: true, advisor: { select: { name: true } } },
    }),
    db.planEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, event: true, createdAt: true, advisor: { select: { name: true } } },
    }),
  ]);

  const mrr = proAdvisors.length * MONTHLY_PRICE_MXN;

  const pendingByAdvisor = new Map<string, { name: string; total: number; count: number }>();
  for (const r of pendingCommissions) {
    const prev = pendingByAdvisor.get(r.advisorId) ?? { name: r.advisor.name, total: 0, count: 0 };
    pendingByAdvisor.set(r.advisorId, {
      name: r.advisor.name,
      total: prev.total + (r.lessioCommission ?? 0),
      count: prev.count + 1,
    });
  }
  const pendingRows = Array.from(pendingByAdvisor.values()).sort((a, b) => b.total - a.total);
  const pendingTotal = pendingRows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-[26px] font-bold text-brand-ink">Pagos</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-brand-ink text-white rounded-2xl p-5">
          <p className="text-sm text-brand-gray-5 mb-3">MRR (suscripciones)</p>
          <p className="text-[34px] font-bold leading-none mb-3">{formatCurrency(mrr)}</p>
          <p className="text-sm text-brand-gray-5">{proAdvisors.length} asesor{proAdvisors.length !== 1 ? "es" : ""} en Pro · {formatCurrency(MONTHLY_PRICE_MXN)}/mes</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-border-1 p-5">
          <p className="text-sm text-brand-gray-3 mb-3">Comisión por facturar</p>
          <p className="text-[34px] font-bold text-brand-ink leading-none mb-3">{formatCurrency(pendingTotal)}</p>
          <p className="text-sm text-brand-gray-4">se suma al próximo cobro mensual de cada asesor</p>
        </div>
      </div>

      {/* Suscripciones activas */}
      <div className="bg-white rounded-2xl border border-brand-border-1 p-6">
        <p className="font-bold text-brand-ink text-[15px] mb-4">Suscripciones Pro</p>
        {proAdvisors.length === 0 ? (
          <p className="text-sm text-brand-gray-4">Ningún asesor en plan Pro todavía.</p>
        ) : (
          <div className="divide-y divide-brand-border-1">
            {proAdvisors.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-3.5 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-ink truncate">{a.name}</p>
                  <p className="text-xs text-brand-gray-4 truncate">{a.email}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {a.paidUntil && (
                    <span className="text-xs text-brand-gray-4">próximo cobro {formatDate(a.paidUntil.toISOString())}</span>
                  )}
                  {a.paymentFailedAt ? (
                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">Cobro rechazado</span>
                  ) : (
                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">Activa</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comisión pendiente por asesor */}
      <div className="bg-white rounded-2xl border border-brand-border-1 p-6">
        <p className="font-bold text-brand-ink text-[15px] mb-4">Comisión pendiente por asesor</p>
        {pendingRows.length === 0 ? (
          <p className="text-sm text-brand-gray-4">No hay comisión pendiente de facturar.</p>
        ) : (
          <div className="divide-y divide-brand-border-1">
            {pendingRows.map((r) => (
              <div key={r.name} className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-semibold text-brand-ink">{r.name}</p>
                  <p className="text-xs text-brand-gray-4">{r.count} contrato{r.count !== 1 ? "s" : ""} sin facturar</p>
                </div>
                <span className="font-bold text-brand-ink">{formatCurrency(r.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de eventos */}
      <div className="bg-white rounded-2xl border border-brand-border-1 p-6">
        <p className="font-bold text-brand-ink text-[15px] mb-4">Eventos de suscripción</p>
        {planEvents.length === 0 ? (
          <p className="text-sm text-brand-gray-4">Sin eventos registrados.</p>
        ) : (
          <div className="divide-y divide-brand-border-1">
            {planEvents.map((e) => {
              const meta = EVENT_LABEL[e.event] ?? { label: e.event, cls: "bg-[#F4F5F7] text-[#6B727D]" };
              return (
                <div key={e.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${meta.cls}`}>{meta.label}</span>
                    <span className="text-sm text-brand-ink truncate">{e.advisor.name}</span>
                  </div>
                  <span className="text-xs text-brand-gray-4 flex-shrink-0">{formatDate(e.createdAt.toISOString())}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
