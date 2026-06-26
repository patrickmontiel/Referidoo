"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { ListSkeleton } from "./Skeletons";

type RankingRow = {
  advisorId: string;
  advisorName: string;
  commissionThisMonth: number;
  convertedTotal: number;
};

export function RankingWidget() {
  const [ranking, setRanking] = useState<RankingRow[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/owner/ranking")
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d?.ranking)) throw new Error("respuesta inválida");
        setRanking(d.ranking);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500 mb-3">Ranking de asesores (este mes)</p>

      {loading && <ListSkeleton rows={3} />}

      {!loading && error && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">No se pudo cargar el ranking.</p>
          <button
            onClick={load}
            className="text-xs font-medium text-black hover:underline transition-transform active:scale-95 py-2 px-1 -mx-1"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && ranking && ranking.length === 0 && (
        <p className="text-sm text-gray-500">Todavía no hay asesores con referidos convertidos.</p>
      )}

      {!loading && !error && ranking && ranking.length > 0 && (
        <div className="space-y-2">
          {ranking.length === 1 && (
            <p className="text-xs text-amber-600 mb-1">Pocos datos todavía — solo un asesor con actividad.</p>
          )}
          {ranking.map((row, i) => (
            <div key={row.advisorId} className="flex items-center justify-between text-sm gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-500 w-4 shrink-0">{i + 1}</span>
                <p className="font-medium truncate">{row.advisorName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-medium">{formatCurrency(row.commissionThisMonth)}</p>
                <p className="text-xs text-gray-500">{row.convertedTotal} convertido(s) en total</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
