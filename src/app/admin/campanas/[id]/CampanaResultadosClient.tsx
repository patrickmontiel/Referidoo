"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Metrics = {
  audience: number; contacted: number; opens: number; shares: number; landingViews: number;
  formStarts: number; referrals: number; productiveReferrers: number;
  productiveReferrerRate: number | null; leadYield: number | null; referralMultiplier: number | null;
};
type Recipient = { recipientId: string; clientName: string; status: string; channel: string | null; error: string | null; contacted: boolean; opened: boolean; shared: boolean; referrals: number };
type WaItem = { recipientId: string; clientName: string; waUrl: string | null; portalUrl: string };
type Detail = {
  campaign: { id: string; name: string; channel: string; status: string; createdAt: string };
  metrics: Metrics; recipients: Recipient[]; whatsappQueue?: WaItem[];
};

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const num = (v: number | null) => (v === null ? "—" : (Math.round(v * 10) / 10).toString());

export default function CampanaResultadosClient({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${campaignId}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  async function sendWhatsApp(item: WaItem) {
    if (item.waUrl) window.open(item.waUrl, "_blank");
    await fetch(`/api/campaigns/${campaignId}/recipients/${item.recipientId}/action`, { method: "POST" }).catch(() => {});
    load();
  }

  if (loading) return <div className="w-full max-w-[900px] text-sm text-brand-gray-4">Cargando…</div>;
  if (!data) return <div className="w-full max-w-[900px] text-sm text-brand-gray-4">No se encontró la campaña.</div>;

  const { campaign, metrics, recipients, whatsappQueue } = data;
  const isWhatsapp = campaign.channel === "whatsapp";
  const contactedLabel = isWhatsapp ? "Acciones de envío" : "Enviados";

  const cards: { label: string; value: string; hint?: string }[] = [
    { label: "Audiencia", value: String(metrics.audience) },
    { label: contactedLabel, value: String(metrics.contacted), hint: isWhatsapp ? "acción, no entrega" : undefined },
    { label: "Portales abiertos", value: String(metrics.opens), hint: "únicos" },
    { label: "Compartieron", value: String(metrics.shares), hint: "clic en compartir" },
    { label: "Vistas de landing", value: String(metrics.landingViews), hint: "no personas únicas" },
    { label: "Formularios iniciados", value: String(metrics.formStarts) },
    { label: "Referidos", value: String(metrics.referrals) },
    { label: "Productive referrers", value: String(metrics.productiveReferrers), hint: "clientes con ≥1 referido" },
  ];

  return (
    <div className="w-full max-w-[900px]">
      <div className="flex items-center gap-2 mb-1">
        <Link href="/admin/campanas" className="text-sm text-brand-gray-4 hover:text-brand-ink">Campañas</Link>
        <span className="text-brand-gray-4">/</span>
        <span className="text-sm text-brand-ink font-medium">{campaign.name}</span>
      </div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="text-2xl font-bold text-brand-ink">{campaign.name}</h1>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand-surface text-brand-gray-2">{isWhatsapp ? "WhatsApp asistido" : "Email"}</span>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-brand-border-1 p-4">
            <p className="text-2xl font-bold text-brand-ink tabular-nums">{c.value}</p>
            <p className="text-xs text-brand-gray-3 mt-0.5">{c.label}</p>
            {c.hint && <p className="text-[11px] text-brand-gray-4 mt-0.5">{c.hint}</p>}
          </div>
        ))}
      </div>

      {/* Tasas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-brand-ink rounded-2xl p-4 text-white">
          <p className="text-2xl font-bold tabular-nums">{pct(metrics.productiveReferrerRate)}</p>
          <p className="text-xs text-white/70 mt-0.5">Productive Referrer Rate</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-border-1 p-4">
          <p className="text-2xl font-bold text-brand-ink tabular-nums">{num(metrics.leadYield)}</p>
          <p className="text-xs text-brand-gray-3 mt-0.5">Lead Yield (referidos / contactado)</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-border-1 p-4">
          <p className="text-2xl font-bold text-brand-ink tabular-nums">{num(metrics.referralMultiplier)}</p>
          <p className="text-xs text-brand-gray-3 mt-0.5">Referral Multiplier</p>
        </div>
      </div>

      {/* WhatsApp assisted: cola de envíos */}
      {isWhatsapp && whatsappQueue && whatsappQueue.length > 0 && (
        <div className="bg-white rounded-2xl border border-brand-border-1 p-5 mb-6">
          <p className="text-sm font-semibold text-brand-ink mb-1">Enviar por WhatsApp ({whatsappQueue.length} pendientes)</p>
          <p className="text-xs text-brand-gray-4 mb-3">Abre el chat prellenado de cada cliente y mándalo tú. Registramos la acción de envío, no la entrega.</p>
          <div className="divide-y divide-brand-border-1">
            {whatsappQueue.map((w) => (
              <div key={w.recipientId} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-brand-ink">{w.clientName}</span>
                <button onClick={() => sendWhatsApp(w)} disabled={!w.waUrl} className="text-sm font-medium text-white bg-[#1FAE54] rounded-full px-4 py-1.5 disabled:opacity-40">
                  {w.waUrl ? "Enviar por WhatsApp" : "Sin teléfono"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drilldown por cliente */}
      <div className="bg-white rounded-2xl border border-brand-border-1 overflow-hidden">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-gray-3 px-5 pt-5 pb-2">Por cliente</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-gray-4 border-b border-brand-border-1">
                <th className="font-medium px-5 py-2">Cliente</th>
                <th className="font-medium px-3 py-2">{isWhatsapp ? "Acción" : "Enviado"}</th>
                <th className="font-medium px-3 py-2">Abrió</th>
                <th className="font-medium px-3 py-2">Compartió</th>
                <th className="font-medium px-3 py-2 text-right pr-5">Referidos</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={r.recipientId} className="border-b border-brand-border-1 last:border-0">
                  <td className="px-5 py-2.5 text-brand-ink">{r.clientName}{r.error && <span className="text-[11px] text-brand-danger-ink ml-2">({r.error})</span>}</td>
                  <td className="px-3 py-2.5">{r.contacted ? "✅" : "—"}</td>
                  <td className="px-3 py-2.5">{r.opened ? "✅" : "—"}</td>
                  <td className="px-3 py-2.5">{r.shared ? "✅" : "❌"}</td>
                  <td className="px-3 py-2.5 text-right pr-5 tabular-nums font-medium text-brand-ink">{r.referrals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
