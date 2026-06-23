"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";
import { Tour, type TourStep } from "@/components/Tour";

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="greeting"]',
    title: "Tu resumen de un vistazo",
    body: "Aquí ves el estado general de tu programa: a quién le pusiste el nombre, cuántos referidos van y cuánto dinero se ha movido.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="stats"]',
    title: "Métricas del programa",
    body: "Clientes activos con link de referido, total de leads recibidos, cuántos convirtieron y cuántos están en proceso. Todo en tiempo real.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="money"]',
    title: "Premios en tiempo real",
    body: "Izquierda: lo que ya pagaste a tus clientes. Derecha: lo que está aprobado y listo para pagar en cuanto lo confirmes.",
    placement: "top",
  },
  {
    selector: '[data-tour="recent"]',
    title: "Últimos referidos",
    body: "Los 5 más recientes — quién los mandó, cuándo llegaron y en qué etapa del proceso están. Haz clic en cualquiera para verlo completo.",
    placement: "top",
  },
];

type Referral = {
  id: string;
  leadName: string;
  leadPhone: string;
  status: string;
  rewardAmount: number;
  rewardStatus: string;
  createdAt: string;
  referrer: { id: string; name: string };
};

type Advisor = { name: string; companyName: string | null; plan?: string; emailVerified?: boolean };

export default function AdminOverviewPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientCount, setClientCount] = useState(0);
  const [showTour, setShowTour] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState("");

  useEffect(() => {
    const handler = () => setShowTour(true);
    window.addEventListener("referidoo:tour", handler);
    return () => window.removeEventListener("referidoo:tour", handler);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/referrals").then((r) => r.json()),
      fetch("/api/advisor/me").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]).then(([refs, adv, clients]) => {
      setReferrals(Array.isArray(refs) ? refs : []);
      setAdvisor(adv?.name ? adv : null);
      setClientCount(Array.isArray(clients) ? clients.length : 0);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleUpgrade() {
    setBillingBusy(true);
    setBillingError("");
    const res = await fetch("/api/billing/subscribe", { method: "POST" });
    const data = await res.json();
    setBillingBusy(false);
    if (!res.ok) { setBillingError(data.error ?? "No se pudo iniciar el cobro"); return; }
    window.location.href = data.checkoutUrl;
  }

  async function handleCancel() {
    setBillingBusy(true);
    setBillingError("");
    const res = await fetch("/api/billing/cancel", { method: "POST" });
    const data = await res.json();
    setBillingBusy(false);
    if (!res.ok) { setBillingError(data.error ?? "No se pudo cancelar"); return; }
    setAdvisor((prev) => (prev ? { ...prev } : prev));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pending = referrals.filter((r) => r.status === "pending").length;
  const converted = referrals.filter((r) => r.status === "converted").length;
  const totalPaid = referrals.filter((r) => r.rewardStatus === "paid").reduce((s, r) => s + r.rewardAmount, 0);
  const totalApproved = referrals.filter((r) => r.rewardStatus === "approved" && r.status === "converted").reduce((s, r) => s + r.rewardAmount, 0);

  const statusConfig: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    contacted: "bg-blue-50 text-blue-700",
    converted: "bg-green-50 text-green-700",
    rejected: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="max-w-2xl">
      {showTour && <Tour steps={TOUR_STEPS} onDone={() => setShowTour(false)} />}

      <div data-tour="greeting" className="mb-6">
        <h1 className="text-xl font-semibold">
          {advisor ? `Hola, ${advisor.name.split(" ")[0]}` : "Resumen"}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">{advisor?.companyName ?? "Panel de referidos"}</p>
      </div>

      {advisor?.plan === "freemium" && advisor.emailVerified && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Plan freemium — hasta 2 clientes</p>
            <p className="text-xs text-gray-400 mt-0.5">Actualiza a pagado ($539/mes) para clientes ilimitados.</p>
          </div>
          <button
            onClick={handleUpgrade}
            disabled={billingBusy}
            className="text-xs font-medium px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-900 disabled:opacity-50 transition flex-shrink-0"
          >
            {billingBusy ? "Redirigiendo..." : "Actualizar a pagado"}
          </button>
        </div>
      )}

      {advisor?.plan === "paid" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex items-center justify-between gap-4">
          <p className="text-sm font-medium">Plan pagado — clientes ilimitados</p>
          <button
            onClick={handleCancel}
            disabled={billingBusy}
            className="text-xs font-medium px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition flex-shrink-0"
          >
            Cancelar plan
          </button>
        </div>
      )}

      {billingError && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl mb-6">
          {billingError}
        </div>
      )}

      {/* Stats */}
      <div data-tour="stats" className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: "Clientes activos", value: clientCount, sub: "con link de referido" },
          { label: "Referidos totales", value: referrals.length, sub: "recibidos" },
          { label: "Convertidos", value: converted, sub: "clientes cerrados" },
          { label: "Pendientes", value: pending, sub: "por contactar" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs font-medium text-gray-700 mt-1">{s.label}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Money */}
      <div data-tour="money" className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-black text-white rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">Premios pagados</p>
          <p className="text-xl font-semibold">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Por pagar (aprobados)</p>
          <p className="text-xl font-semibold">{formatCurrency(totalApproved)}</p>
        </div>
      </div>

      {/* Recent */}
      <div data-tour="recent" className="bg-white rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="font-medium text-sm">Últimos referidos</h2>
          <Link href="/admin/referidos" className="text-xs text-gray-400 hover:text-black transition">
            Ver todos →
          </Link>
        </div>
        {referrals.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">Aún no hay referidos.</p>
            <Link href="/admin/clientes" className="text-xs text-black underline mt-2 inline-block">
              Agrega tu primer cliente
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {referrals.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.leadName}</p>
                  <p className="text-xs text-gray-400">Vía {r.referrer.name} · {formatDate(r.createdAt)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[r.status]}`}>
                    {getStatusLabel(r.status)}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{formatCurrency(r.rewardAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
