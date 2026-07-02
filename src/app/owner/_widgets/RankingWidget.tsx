"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ListSkeleton } from "./Skeletons";

type ProductBreakdown = {
  productType: string;
  count: number;
  commission: number;
  rewardTotal: number;
};

type AdvisorRow = {
  advisorId: string;
  advisorName: string;
  advisorEmail: string;
  isDeleted: boolean;
  deletedAt: string | null;
  commissionThisMonth: number;
  commissionAllTime: number;
  convertedTotal: number;
  convertedThisMonth: number;
  breakdown: ProductBreakdown[];
};

type RankingData = {
  active: AdvisorRow[];
  deleted: AdvisorRow[];
  monthStart: string;
};

function AdvisorCard({
  row,
  rank,
  defaultOpen = false,
}: {
  row: AdvisorRow;
  rank?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-xl border transition-colors ${row.isDeleted ? "border-brand-border-1 bg-brand-surface/40" : "border-brand-border-1 bg-white"}`}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {rank !== undefined && (
          <span className="text-xs text-brand-gray-4 w-5 shrink-0">{rank}</span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-medium text-sm truncate ${row.isDeleted ? "text-brand-gray-4" : "text-brand-ink"}`}>
              {row.advisorName}
            </p>
            {row.isDeleted && (
              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">
                Dado de baja
              </span>
            )}
          </div>
          <p className="text-xs text-brand-gray-4 truncate">{row.advisorEmail}</p>
        </div>
        <div className="text-right shrink-0">
          {row.isDeleted ? (
            <>
              <p className="text-sm font-semibold text-brand-gray-4">
                {formatCurrency(row.commissionAllTime)}
              </p>
              <p className="text-xs text-brand-gray-4">{row.convertedTotal} contrato(s) total</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-brand-ink">
                {formatCurrency(row.commissionThisMonth)}
              </p>
              <p className="text-xs text-brand-gray-4">
                {row.convertedThisMonth} este mes · {row.convertedTotal} total
              </p>
            </>
          )}
        </div>
        <svg
          className={`w-4 h-4 shrink-0 text-brand-gray-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-brand-border-1 px-4 py-3 space-y-3">
          {/* Summary totals */}
          {!row.isDeleted && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-gray-4 mb-0.5">Este mes</p>
                <p className="text-sm font-bold text-brand-ink">{formatCurrency(row.commissionThisMonth)}</p>
                <p className="text-xs text-brand-gray-4">{row.convertedThisMonth} contratos</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-gray-4 mb-0.5">Todo el tiempo</p>
                <p className="text-sm font-bold text-brand-ink">{formatCurrency(row.commissionAllTime)}</p>
                <p className="text-xs text-brand-gray-4">{row.convertedTotal} contratos</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-gray-4 mb-0.5">Sin comisión calc.</p>
                <p className="text-sm font-bold text-brand-ink">
                  {row.breakdown.find(b => b.productType === "Sin clasificar")?.count ?? 0}
                </p>
                <p className="text-xs text-brand-gray-4">contratos legacy</p>
              </div>
            </div>
          )}

          {row.isDeleted && row.deletedAt && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-gray-4 mb-0.5">Comisión generada</p>
                <p className="text-sm font-bold text-brand-ink">{formatCurrency(row.commissionAllTime)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-gray-4 mb-0.5">Fecha de baja</p>
                <p className="text-sm font-bold text-brand-ink">{formatDate(row.deletedAt)}</p>
              </div>
            </div>
          )}

          {/* Product breakdown */}
          {row.breakdown.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-brand-gray-4 mb-2">Desglose por producto (todo el tiempo)</p>
              <div className="space-y-1">
                {row.breakdown.map((b) => (
                  <div key={b.productType} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-brand-surface">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-brand-ink">{b.productType}</span>
                      <span className="text-brand-gray-4">{b.count} contrato{b.count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-brand-ink">{formatCurrency(b.commission)}</span>
                      <span className="text-brand-gray-4 ml-2">comisión Referidoo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {row.convertedTotal === 0 && (
            <p className="text-xs text-brand-gray-4">Sin contratos cerrados todavía.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function RankingWidget() {
  const [data, setData] = useState<RankingData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/owner/ranking")
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d?.active)) throw new Error("respuesta inválida");
        setData(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div className="bg-white rounded-2xl border border-brand-border-1 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-brand-gray-4">Ranking de asesores (este mes)</p>
        <button onClick={load} className="text-xs text-brand-gray-4 hover:text-brand-ink transition">
          ↻ Actualizar
        </button>
      </div>

      {loading && <ListSkeleton rows={3} />}

      {!loading && error && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-brand-gray-4">No se pudo cargar el ranking.</p>
          <button onClick={load} className="text-xs font-medium text-brand-ink hover:underline">
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-2">
          {/* Active advisors */}
          {data.active.length === 0 && (
            <p className="text-sm text-brand-gray-4">Todavía no hay asesores activos con referidos convertidos.</p>
          )}

          {data.active.map((row, i) => (
            <AdvisorCard key={row.advisorId} row={row} rank={i + 1} />
          ))}

          {/* Deleted advisors section */}
          {data.deleted.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowDeleted((p) => !p)}
                className="flex items-center gap-1.5 text-xs text-brand-gray-4 hover:text-brand-ink transition mb-2"
              >
                <span>{showDeleted ? "▾" : "▸"}</span>
                <span>{data.deleted.length} asesor{data.deleted.length !== 1 ? "es" : ""} dado{data.deleted.length !== 1 ? "s" : ""} de baja</span>
              </button>

              {showDeleted && (
                <div className="space-y-2">
                  {data.deleted.map((row) => (
                    <AdvisorCard key={row.advisorId} row={row} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
