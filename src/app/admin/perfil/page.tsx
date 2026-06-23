"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { UpgradeCardForm } from "@/components/UpgradeCardForm";

type Advisor = {
  name: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  createdAt: string;
  plan: string;
  emailVerified: boolean;
  paidUntil: string | null;
};

export default function PerfilPage() {
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);

  useEffect(() => {
    fetch("/api/advisor/me")
      .then((r) => r.json())
      .then((adv) => setAdvisor(adv?.name ? adv : null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleUpgradeSuccess() {
    setShowUpgradeForm(false);
    setAdvisor((prev) => (prev ? { ...prev, plan: "paid" } : prev));
  }

  async function handleCancel() {
    setBillingBusy(true);
    setBillingError("");
    const res = await fetch("/api/billing/cancel", { method: "POST" });
    const data = await res.json();
    setBillingBusy(false);
    if (!res.ok) { setBillingError(data.error ?? "No se pudo cancelar"); return; }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!advisor) {
    return <p className="text-sm text-gray-400">No se pudo cargar tu perfil.</p>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">Tu perfil</h1>

      {/* Datos de la cuenta */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <h2 className="text-sm font-medium mb-4">Datos de la cuenta</h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">Nombre</dt>
            <dd className="text-sm mt-0.5">{advisor.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">Correo</dt>
            <dd className="text-sm mt-0.5">{advisor.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">Despacho / empresa</dt>
            <dd className="text-sm mt-0.5">{advisor.companyName || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">Teléfono</dt>
            <dd className="text-sm mt-0.5">{advisor.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">Asesor desde</dt>
            <dd className="text-sm mt-0.5">{formatDate(advisor.createdAt)}</dd>
          </div>
        </dl>
      </div>

      {/* Plan */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <h2 className="text-sm font-medium mb-4">Tu plan</h2>

        {!advisor.emailVerified && (
          <div className="bg-sky-50 border border-sky-100 text-sky-800 text-sm px-4 py-3 rounded-xl mb-4">
            Verifica tu correo para empezar a agregar clientes — revisa tu bandeja de entrada.
          </div>
        )}

        {advisor.plan === "paid" ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Plan pagado — clientes ilimitados</p>
              {advisor.paidUntil && (
                <p className="text-xs text-gray-400 mt-0.5">Próximo cobro: {formatDate(advisor.paidUntil)}</p>
              )}
            </div>
            <button
              onClick={handleCancel}
              disabled={billingBusy}
              className="text-xs font-medium px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition flex-shrink-0"
            >
              Cancelar plan
            </button>
          </div>
        ) : !showUpgradeForm ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Plan freemium — hasta 2 clientes</p>
              <p className="text-xs text-gray-400 mt-0.5">Actualiza a pagado ($539/mes) para clientes ilimitados.</p>
            </div>
            <button
              onClick={() => setShowUpgradeForm(true)}
              disabled={!advisor.emailVerified}
              className="text-xs font-medium px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-900 disabled:opacity-50 transition flex-shrink-0"
            >
              Actualizar a pagado
            </button>
          </div>
        ) : (
          <UpgradeCardForm onSuccess={handleUpgradeSuccess} onCancel={() => setShowUpgradeForm(false)} />
        )}

        {billingError && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl mt-4">
            {billingError}
          </div>
        )}
      </div>
    </div>
  );
}
