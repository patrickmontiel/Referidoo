"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { ListSkeleton } from "./Skeletons";

type FailedPayment = {
  advisorId: string;
  advisorName: string;
  advisorEmail: string;
  failedAt: string;
  pastGracePeriod: boolean;
};

type StuckReferral = {
  referralId: string;
  leadName: string;
  advisorName: string;
  referrerName: string;
  createdAt: string;
};

type ProblemsResponse = {
  failedPayments: FailedPayment[];
  stuckReferrals: StuckReferral[];
};

export function ProblemsWidget() {
  const [data, setData] = useState<ProblemsResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/owner/problems")
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d?.failedPayments) || !Array.isArray(d?.stuckReferrals)) throw new Error("respuesta inválida");
        setData(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const total = (data?.failedPayments.length ?? 0) + (data?.stuckReferrals.length ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-brand-border-1 p-4">
      <p className="text-xs text-brand-gray-4 mb-3">Problemas operativos</p>

      {loading && <ListSkeleton rows={2} />}

      {!loading && error && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-brand-gray-4">No se pudo cargar el feed de problemas.</p>
          <button
            onClick={load}
            className="text-xs font-medium text-brand-ink hover:underline transition-transform active:scale-95 py-2 px-1 -mx-1"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && data && total === 0 && (
        <p className="text-sm text-brand-gray-4">Sin problemas operativos pendientes. 🎉</p>
      )}

      {!loading && !error && data && total > 0 && (
        <div className="space-y-3">
          {data.failedPayments.map((p) => (
            <div key={p.advisorId} className="flex items-center justify-between text-sm gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{p.advisorName}</p>
                <p className="text-xs text-brand-gray-4 truncate">{p.advisorEmail}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap shrink-0 ${p.pastGracePeriod ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                Pago fallido desde {formatDate(p.failedAt)}
              </span>
            </div>
          ))}
          {data.stuckReferrals.map((r) => (
            <div key={r.referralId} className="flex items-center justify-between text-sm gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{r.leadName}</p>
                <p className="text-xs text-brand-gray-4 truncate">{r.advisorName} · referido por {r.referrerName}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full whitespace-nowrap shrink-0 bg-amber-50 text-amber-600">
                Sin confirmar desde {formatDate(r.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
