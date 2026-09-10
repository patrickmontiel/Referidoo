"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CampaignSummary = { id: string; name: string; channel: string; status: string; createdAt: string; audience: number; contacted: number; referrals: number };

export default function CampanasListClient() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null);

  useEffect(() => {
    fetch("/api/campaigns").then((r) => (r.ok ? r.json() : [])).then(setCampaigns).catch(() => setCampaigns([]));
  }, []);

  return (
    <div className="w-full max-w-[820px]">
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Campañas</h1>
          <p className="text-sm text-brand-gray-4 mt-0.5">Activa tu cartera: manda a tus clientes su link para que te refieran.</p>
        </div>
        <Link href="/admin/campanas/nueva" className="text-sm font-semibold text-white bg-[#2563EB] rounded-full px-5 py-2.5">Activar mi cartera</Link>
      </div>

      {campaigns === null ? (
        <p className="text-sm text-brand-gray-4">Cargando…</p>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-brand-border-1 p-8 text-center">
          <p className="text-sm text-brand-ink font-medium mb-1">Aún no activas tu cartera</p>
          <p className="text-sm text-brand-gray-4 mb-4">Elige a tus mejores clientes y mándales su link de una vez. Es el primer paso para que te empiecen a referir.</p>
          <Link href="/admin/campanas/nueva" className="inline-block text-sm font-semibold text-white bg-brand-ink rounded-full px-5 py-2.5">Activar mi cartera →</Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-border-1 overflow-hidden divide-y divide-brand-border-1">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/admin/campanas/${c.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-brand-surface transition">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-brand-ink truncate">{c.name}</span>
                <span className="block text-xs text-brand-gray-4">{c.channel === "whatsapp" ? "WhatsApp" : "Email"} · {c.audience} clientes · {c.contacted} contactados</span>
              </span>
              <span className="text-sm tabular-nums text-brand-ink font-semibold flex-shrink-0">{c.referrals} <span className="text-xs text-brand-gray-4 font-normal">referidos</span></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
