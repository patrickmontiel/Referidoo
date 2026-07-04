import { redirect } from "next/navigation";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";
import { formatCurrency } from "@/lib/utils";

// Espejo de LESSIO_COMMISSION_RATES en src/lib/rewards.ts — solo lectura.
const RATES = [
  { product: "PPR", freemium: "0.25%", paid: "0.15%" },
  { product: "Vida", freemium: "0.25%", paid: "0.15%" },
  { product: "Daños/Auto", freemium: "1.5%", paid: "0.80%" },
  { product: "GMM", freemium: "1.5%", paid: "0.80%" },
  { product: "Otro", freemium: "1.5%", paid: "0.80%" },
];

export default async function OwnerConfiguracionPage() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) redirect("/login");

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-[26px] font-bold text-brand-ink">Configuración</h1>

      <div className="bg-white rounded-2xl border border-brand-border-1 p-6">
        <p className="font-bold text-brand-ink text-[15px] mb-4">Cuenta del dueño</p>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-brand-gray-4">Correo</span>
          <span className="text-sm font-semibold text-brand-ink">{session.email}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-border-1 p-6">
        <p className="font-bold text-brand-ink text-[15px] mb-1">Parámetros de la plataforma</p>
        <p className="text-xs text-brand-gray-4 mb-5">
          Solo lectura — estos valores se cambian en código (src/lib/rewards.ts y src/lib/mercadopago.ts).
        </p>

        <div className="flex items-center justify-between py-3 border-b border-brand-border-1">
          <span className="text-sm text-brand-gray-3">Precio plan Pro</span>
          <span className="text-sm font-bold text-brand-ink">{formatCurrency(MONTHLY_PRICE_MXN)} MXN / mes</span>
        </div>

        <div className="pt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-gray-4 mb-3">
            Comisión Referidoo por producto
          </p>
          <div className="grid grid-cols-3 text-xs font-bold text-brand-gray-4 pb-2">
            <span>Producto</span>
            <span className="text-right">Plan gratuito</span>
            <span className="text-right">Plan Pro</span>
          </div>
          <div className="divide-y divide-brand-border-1">
            {RATES.map((r) => (
              <div key={r.product} className="grid grid-cols-3 text-sm py-2.5">
                <span className="text-brand-ink font-medium">{r.product}</span>
                <span className="text-right text-brand-gray-2">{r.freemium}</span>
                <span className="text-right font-semibold text-[#2563EB]">{r.paid}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-border-1 p-6">
        <p className="font-bold text-brand-ink text-[15px] mb-4">Referencias</p>
        <div className="space-y-2 text-sm">
          <p className="text-brand-gray-3">
            Comisión por contrato registrada desde el <b className="text-brand-ink">24 jun 2026</b> — conversiones
            anteriores no tienen comisión calculada.
          </p>
          <p className="text-brand-gray-3">
            Los cobros de suscripción y comisión corren vía Mercado Pago con crons diarios
            (billing-commission y billing-downgrade).
          </p>
        </div>
      </div>
    </div>
  );
}
