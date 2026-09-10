"use client";

import { useEffect } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/track-client";

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  ambos: "WhatsApp y Email",
};

export function EmpezarClient({
  products,
  channel,
  portfolioCount,
  contactableCount,
  tierCount,
  maxTier,
  suggestedSize,
  sampleClientName,
  samplePortalPath,
  previewMessage,
}: {
  products: string | null;
  channel: string | null;
  portfolioCount: number;
  contactableCount: number;
  tierCount: number;
  maxTier: number;
  suggestedSize: number;
  sampleClientName: string | null;
  samplePortalPath: string | null;
  previewMessage: string;
}) {
  // Evento de onboarding (sin PII). Una vez por carga.
  useEffect(() => {
    trackEvent("system_preview_viewed");
  }, []);

  const rows: { label: string; value: string; ok: boolean }[] = [
    { label: "Productos", value: products ?? "Sin definir", ok: !!products },
    { label: "Cartera", value: `${portfolioCount} clientes conectados`, ok: portfolioCount > 0 },
    { label: "Contactables", value: `${contactableCount} con teléfono o correo`, ok: contactableCount > 0 },
    { label: "Premios", value: tierCount > 0 ? `${tierCount} niveles · hasta $${maxTier.toLocaleString("es-MX")}` : "Sin configurar", ok: tierCount > 0 },
    { label: "Canal", value: channel ? CHANNEL_LABEL[channel] ?? channel : "Sin definir", ok: !!channel },
  ];

  return (
    <div className="w-full max-w-[760px]">
      <h1 className="text-2xl font-bold text-brand-ink mb-1">Así quedó tu sistema</h1>
      <p className="text-sm text-brand-gray-4 mb-5">
        Revisa que esté como lo quieres antes de activar tu cartera. Nada se envía todavía.
      </p>

      {/* Resumen REAL — solo lo que de verdad está configurado */}
      <div className="bg-white rounded-2xl border border-brand-border-1 p-5 mb-4">
        <dl className="divide-y divide-brand-border-1">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
              <dt className="text-sm text-brand-gray-4">{r.label}</dt>
              <dd className={`text-sm font-medium ${r.ok ? "text-brand-ink" : "text-brand-gray-4"}`}>
                {r.ok ? "✓ " : "○ "}{r.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* PREVIEW REAL: el mensaje y el portal de un cliente real de su cartera */}
      <div className="bg-white rounded-2xl border border-brand-border-1 p-5 mb-4">
        <p className="text-sm font-semibold text-brand-ink mb-1">Esto es lo que va a recibir tu cliente</p>
        <p className="text-xs text-brand-gray-4 mb-3">
          {sampleClientName
            ? `Ejemplo real con ${sampleClientName.split(" ")[0]}, de tu cartera. Tu cliente no necesita crear cuenta ni descargar nada.`
            : "Conecta al menos un cliente para ver el preview."}
        </p>
        {previewMessage && (
          <div className="bg-brand-surface rounded-xl p-4 text-sm text-brand-gray-1 whitespace-pre-wrap mb-3">
            {previewMessage}
          </div>
        )}
        {samplePortalPath && (
          <Link
            href={samplePortalPath}
            target="_blank"
            className="inline-block text-sm font-medium text-brand-blue hover:underline"
          >
            Ver su portal real →
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/admin/campanas/nueva"
          onClick={() => trackEvent("activation_flow_started")}
          className="text-sm font-semibold text-white bg-[#2563EB] rounded-full px-6 py-2.5"
        >
          Está listo — activar {Math.min(suggestedSize, contactableCount || portfolioCount)} clientes
        </Link>
        <Link href="/admin/niveles" className="text-sm font-medium text-brand-gray-2 hover:text-brand-ink">
          Editar premios o mensaje
        </Link>
      </div>
      <p className="text-xs text-brand-gray-4 mt-3">
        Empieza con un grupo para ver cómo responde tu cartera. Después puedes activar más sin volver a cargar nada.
      </p>
    </div>
  );
}
