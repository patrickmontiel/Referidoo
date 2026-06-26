"use client";

import { Fragment, useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

type AdvisorRow = {
  id: string;
  name: string;
  email: string;
  plan: string;
  emailVerified: boolean;
  createdAt: string;
  paidUntil: string | null;
  paymentFailedAt: string | null;
  mpPreapprovalId: string | null;
};

export default function OwnerAsesoresPage() {
  const [advisors, setAdvisors] = useState<AdvisorRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmToggleId, setConfirmToggleId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/advisors")
      .then(async (r) => {
        if (!r.ok) { setError("No autorizado"); return; }
        setAdvisors(await r.json());
      })
      .catch(() => setError("No se pudo cargar la lista"));
  }, []);

  async function togglePlan(advisor: AdvisorRow) {
    setBusyId(advisor.id);
    const nextPlan = advisor.plan === "paid" ? "freemium" : "paid";
    const res = await fetch(`/api/admin/advisors/${advisor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: nextPlan }),
    });
    setBusyId(null);
    setConfirmToggleId(null);
    if (!res.ok) return;
    const updated = await res.json();
    setAdvisors((prev) => prev?.map((a) => (a.id === advisor.id ? { ...a, ...updated } : a)) ?? null);
  }

  if (error) {
    return <p className="text-sm text-gray-500">{error}</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-5">Asesores</h1>

      {advisors === null && <p className="text-sm text-gray-500">Cargando...</p>}

      {advisors !== null && advisors.length === 0 && (
        <p className="text-sm text-gray-500">Sin asesores registrados todavía.</p>
      )}

      {advisors !== null && advisors.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Correo</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-left px-4 py-3">Verificado</th>
                <th className="text-left px-4 py-3">Desde</th>
                <th className="text-right px-4 py-3 sticky right-0 bg-gray-50">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {advisors.map((advisor) => (
                <Fragment key={advisor.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === advisor.id ? null : advisor.id)}
                    className="group cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium">{advisor.name}</td>
                    <td className="px-4 py-3 text-gray-500">{advisor.email}</td>
                    <td className="px-4 py-3">{advisor.plan === "paid" ? "Pagado" : "Freemium"}</td>
                    <td className="px-4 py-3">{advisor.emailVerified ? "Sí" : "No"}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(advisor.createdAt)}</td>
                    <td className="px-4 py-3 text-right sticky right-0 bg-white group-hover:bg-gray-50">
                      {confirmToggleId === advisor.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePlan(advisor); }}
                            disabled={busyId === advisor.id}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                          >
                            {busyId === advisor.id ? "Cambiando..." : "Confirmar"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmToggleId(null); }}
                            disabled={busyId === advisor.id}
                            className="text-xs text-gray-500 hover:text-gray-700 transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmToggleId(advisor.id); }}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                        >
                          {advisor.plan === "paid" ? "Pasar a freemium" : "Pasar a pagado"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === advisor.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="px-4 py-4">
                        <dl className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <dt className="text-gray-500 uppercase tracking-wider mb-1">Próximo cobro</dt>
                            <dd>{advisor.paidUntil ? formatDate(advisor.paidUntil) : "Sin suscripción activa"}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500 uppercase tracking-wider mb-1">Último cobro fallido</dt>
                            <dd>{advisor.paymentFailedAt ? formatDate(advisor.paymentFailedAt) : "Ninguno"}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500 uppercase tracking-wider mb-1">ID suscripción Mercado Pago</dt>
                            <dd className="truncate">{advisor.mpPreapprovalId ?? "—"}</dd>
                          </div>
                        </dl>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
