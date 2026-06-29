"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { UpgradeCardForm } from "@/components/UpgradeCardForm";

type PendingCommission = {
  id: string;
  leadName: string;
  productType: string | null;
  saleAmount: number | null;
  lessioCommission: number | null;
  createdAt: string;
};

type Advisor = {
  name: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  createdAt: string;
  plan: string;
  emailVerified: boolean;
  paidUntil: string | null;
  monthlyPriceMxn: number;
  pendingCommissionTotal: number;
  pendingCommissions: PendingCommission[];
};

export default function PerfilPage() {
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

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
    setConfirmingCancel(false);
    if (!res.ok) { setBillingError(data.error ?? "No se pudo cancelar"); return; }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!advisor) {
    return <p className="text-sm text-brand-gray-4">No se pudo cargar tu perfil.</p>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">Tu perfil</h1>

      {/* Datos de la cuenta */}
      <div className="bg-white rounded-2xl border border-brand-border-1 p-5 mb-6">
        <h2 className="text-sm font-medium mb-4">Datos de la cuenta</h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-xs font-medium text-brand-gray-4 uppercase tracking-wider">Nombre</dt>
            <dd className="text-sm mt-0.5">{advisor.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-brand-gray-4 uppercase tracking-wider">Correo</dt>
            <dd className="text-sm mt-0.5 flex items-center gap-2">
              {advisor.email}
              {advisor.emailVerified ? (
                <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  Verificado
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Sin verificar
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-brand-gray-4 uppercase tracking-wider">Despacho / empresa</dt>
            <dd className="text-sm mt-0.5">{advisor.companyName || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-brand-gray-4 uppercase tracking-wider">Teléfono</dt>
            <dd className="text-sm mt-0.5">{advisor.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-brand-gray-4 uppercase tracking-wider">Asesor desde</dt>
            <dd className="text-sm mt-0.5">{formatDate(advisor.createdAt)}</dd>
          </div>
        </dl>
      </div>

      {/* Plan */}
      <div className="bg-white rounded-2xl border border-brand-border-1 p-5 mb-6">
        <h2 className="text-sm font-medium mb-4">Tu plan</h2>

        {!advisor.emailVerified && (
          <div className="bg-sky-50 border border-sky-100 text-sky-800 text-sm px-4 py-3 rounded-xl mb-4">
            Verifica tu correo para empezar a agregar clientes — revisa tu bandeja de entrada.
          </div>
        )}

        {advisor.plan === "paid" ? (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <p className="text-sm font-medium">Plan pagado — clientes ilimitados</p>
                {advisor.paidUntil && (
                  <p className="text-xs text-brand-gray-4 mt-0.5">
                    Próximo cobro: {formatDate(advisor.paidUntil)} — $
                    {advisor.monthlyPriceMxn + advisor.pendingCommissionTotal} MXN
                  </p>
                )}
              </div>
              {confirmingCancel ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleCancel}
                    disabled={billingBusy}
                    className="text-xs font-medium px-3 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                  >
                    {billingBusy ? "Cancelando..." : "Confirmar"}
                  </button>
                  <button
                    onClick={() => setConfirmingCancel(false)}
                    disabled={billingBusy}
                    className="text-xs font-medium px-3 py-2 rounded-full text-brand-gray-2 hover:bg-brand-surface disabled:opacity-50 transition"
                  >
                    No, mantener plan
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingCancel(true)}
                  className="text-xs font-medium px-4 py-2 rounded-full border border-brand-border-4 hover:bg-brand-surface transition self-start sm:flex-shrink-0"
                >
                  Cancelar plan
                </button>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-brand-border-1">
              <p className="text-xs font-medium text-brand-gray-4 uppercase tracking-wider mb-2">
                Desglose del próximo cobro
              </p>
              <div className="flex items-center justify-between text-sm py-1">
                <span className="text-brand-gray-2">Mensualidad</span>
                <span>${advisor.monthlyPriceMxn} MXN</span>
              </div>
              {advisor.pendingCommissions.length === 0 ? (
                <div className="flex items-center justify-between text-sm py-1">
                  <span className="text-brand-gray-2">Comisión Referidoo</span>
                  <span>$0 MXN</span>
                </div>
              ) : (
                <>
                  {advisor.pendingCommissions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm py-1">
                      <span className="text-brand-gray-2">
                        Comisión por {c.leadName}
                        {c.productType ? ` (${c.productType})` : ""}
                      </span>
                      <span>${c.lessioCommission} MXN</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm py-1 font-medium border-t border-brand-border-2 mt-1 pt-1">
                    <span>Comisión Referidoo</span>
                    <span>${advisor.pendingCommissionTotal} MXN</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between text-sm py-1 font-medium mt-1 pt-1 border-t border-brand-border-1">
                <span>Total</span>
                <span>${advisor.monthlyPriceMxn + advisor.pendingCommissionTotal} MXN</span>
              </div>
            </div>
          </div>
        ) : !showUpgradeForm ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <p className="text-sm font-medium">Plan freemium — hasta 2 clientes</p>
              <p className="text-xs text-brand-gray-4 mt-0.5">Actualiza a pagado ($539/mes) para clientes ilimitados.</p>
            </div>
            <button
              onClick={() => setShowUpgradeForm(true)}
              disabled={!advisor.emailVerified}
              className="text-xs font-medium px-4 py-2 rounded-full bg-brand-ink text-white hover:bg-[#26262a] disabled:opacity-50 transition self-start sm:flex-shrink-0"
            >
              Subir de plan
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
