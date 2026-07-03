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
  deletedAt: string | null;
  paidUntil: string | null;
  paymentFailedAt: string | null;
  mpPreapprovalId: string | null;
};

export default function OwnerAsesoresPage() {
  const [advisors, setAdvisors] = useState<AdvisorRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmToggleId, setConfirmToggleId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resentId, setResentId] = useState<string | null>(null);

  async function resendVerification(advisorId: string) {
    setResendingId(advisorId);
    const res = await fetch("/api/owner/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advisorId }),
    });
    setResendingId(null);
    if (res.ok) {
      setResentId(advisorId);
      setTimeout(() => setResentId(null), 4000);
    }
  }

  useEffect(() => {
    fetch("/api/admin/advisors")
      .then(async (r) => {
        if (!r.ok) { setError("No autorizado"); return; }
        setAdvisors(await r.json());
      })
      .catch(() => setError("No se pudo cargar la lista"));
  }, []);

  async function deleteAdvisor(advisorId: string) {
    setBusyId(advisorId);
    const res = await fetch(`/api/admin/advisors/${advisorId}`, { method: "DELETE" });
    setBusyId(null);
    setConfirmDeleteId(null);
    if (!res.ok) return;
    setAdvisors((prev) =>
      prev?.map((a) => a.id === advisorId ? { ...a, deletedAt: new Date().toISOString() } : a) ?? null
    );
  }

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
    return <p className="text-sm text-brand-gray-4">{error}</p>;
  }

  const active  = advisors?.filter((a) => !a.deletedAt) ?? [];
  const deleted = advisors?.filter((a) => !!a.deletedAt) ?? [];

  function AdvisorTable({ rows, showActions }: { rows: AdvisorRow[]; showActions: boolean }) {
    return (
      <div className="bg-white rounded-2xl border border-brand-border-1 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-brand-surface text-brand-gray-4 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Correo</th>
              <th className="text-left px-4 py-3">Plan</th>
              <th className="text-left px-4 py-3">Verificado</th>
              <th className="text-left px-4 py-3">Desde</th>
              {showActions
                ? <th className="text-right px-4 py-3 sticky right-0 bg-brand-surface">Acción</th>
                : <th className="text-left px-4 py-3">Fecha de baja</th>
              }
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border-1">
            {rows.map((advisor) => (
              <Fragment key={advisor.id}>
                <tr
                  onClick={() => setExpandedId(expandedId === advisor.id ? null : advisor.id)}
                  className={`group cursor-pointer hover:bg-brand-surface ${advisor.deletedAt ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {advisor.name}
                      {advisor.deletedAt && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">
                          Baja
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-gray-4">{advisor.email}</td>
                  <td className="px-4 py-3">{advisor.plan === "paid" ? "Pagado" : "Freemium"}</td>
                  <td className="px-4 py-3">{advisor.emailVerified ? "Sí" : "No"}</td>
                  <td className="px-4 py-3 text-brand-gray-4">{formatDate(advisor.createdAt)}</td>
                  {showActions ? (
                    <td className="px-4 py-3 text-right sticky right-0 bg-white group-hover:bg-brand-surface">
                      {confirmDeleteId === advisor.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteAdvisor(advisor.id); }}
                            disabled={busyId === advisor.id}
                            className="text-xs font-medium px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
                          >
                            {busyId === advisor.id ? "Dando de baja..." : "Confirmar baja"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                            disabled={busyId === advisor.id}
                            className="text-xs text-brand-gray-4 hover:text-brand-gray-1 transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : confirmToggleId === advisor.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePlan(advisor); }}
                            disabled={busyId === advisor.id}
                            className="text-xs font-medium px-3 py-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                          >
                            {busyId === advisor.id ? "Cambiando..." : "Confirmar"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmToggleId(null); }}
                            disabled={busyId === advisor.id}
                            className="text-xs text-brand-gray-4 hover:text-brand-gray-1 transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {!advisor.emailVerified && (
                            <button
                              onClick={(e) => { e.stopPropagation(); resendVerification(advisor.id); }}
                              disabled={resendingId === advisor.id}
                              className="text-xs font-medium px-3 py-1.5 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition"
                            >
                              {resendingId === advisor.id ? "Enviando..." : resentId === advisor.id ? "✓ Enviado" : "Reenviar verificación"}
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmToggleId(advisor.id); }}
                            className="text-xs font-medium px-3 py-1.5 rounded-full border border-brand-border-4 hover:bg-brand-surface transition"
                          >
                            {advisor.plan === "paid" ? "Pasar a freemium" : "Pasar a pagado"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(advisor.id); }}
                            className="text-xs font-medium px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition"
                          >
                            Dar de baja
                          </button>
                        </div>
                      )}
                    </td>
                  ) : (
                    <td className="px-4 py-3 text-brand-gray-4 text-xs">
                      {advisor.deletedAt ? formatDate(advisor.deletedAt) : "—"}
                    </td>
                  )}
                </tr>
                {expandedId === advisor.id && (
                  <tr className="bg-brand-surface">
                    <td colSpan={6} className="px-4 py-4">
                      <dl className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <dt className="text-brand-gray-4 uppercase tracking-wider mb-1">Próximo cobro</dt>
                          <dd>{advisor.paidUntil ? formatDate(advisor.paidUntil) : "Sin suscripción activa"}</dd>
                        </div>
                        <div>
                          <dt className="text-brand-gray-4 uppercase tracking-wider mb-1">Último cobro fallido</dt>
                          <dd>{advisor.paymentFailedAt ? formatDate(advisor.paymentFailedAt) : "Ninguno"}</dd>
                        </div>
                        <div>
                          <dt className="text-brand-gray-4 uppercase tracking-wider mb-1">ID suscripción Mercado Pago</dt>
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
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-5 text-brand-ink">Asesores</h1>

      {advisors === null && <p className="text-sm text-brand-gray-4">Cargando...</p>}

      {advisors !== null && advisors.length === 0 && (
        <p className="text-sm text-brand-gray-4">Sin asesores registrados todavía.</p>
      )}

      {active.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-brand-gray-4 mb-2">{active.length} asesor{active.length !== 1 ? "es" : ""} activo{active.length !== 1 ? "s" : ""}</p>
          <AdvisorTable rows={active} showActions={true} />
        </div>
      )}

      {deleted.length > 0 && (
        <div>
          <button
            onClick={() => setShowDeleted((p) => !p)}
            className="flex items-center gap-1.5 text-xs text-brand-gray-4 hover:text-brand-ink transition mb-2"
          >
            <span>{showDeleted ? "▾" : "▸"}</span>
            <span>{deleted.length} asesor{deleted.length !== 1 ? "es" : ""} dado{deleted.length !== 1 ? "s" : ""} de baja</span>
          </button>
          {showDeleted && <AdvisorTable rows={deleted} showActions={false} />}
        </div>
      )}
    </div>
  );
}
