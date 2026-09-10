"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/track-client";
import type { SetupProgress } from "@/lib/advisor-state";

// RECOVERY — para el asesor que YA tiene cartera y nunca activó.
// No es el onboarding de cuenta nueva: no hay welcome, ni tour, ni checklist
// genérica de 5 tareas. El mensaje es "Referidoo ya recuerda lo que hiciste".
export function RecoveryCard({
  clientCount,
  contactableCount,
  progress,
  needsProfile,
  suggestedSize,
}: {
  clientCount: number;
  contactableCount: number;
  progress: SetupProgress;
  needsProfile: boolean;
  suggestedSize: number;
}) {
  const router = useRouter();
  const [products, setProducts] = useState<string>("");
  const [channel, setChannel] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    if (!products || !channel) return;
    setSaving(true);
    await fetch("/api/advisor/business-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products, defaultChannel: channel }),
    }).catch(() => {});
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-border-1 p-6 mb-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-gray-3 mb-2">Ya empezaste</p>
      <h2 className="text-xl font-bold text-brand-ink mb-1">
        Ya tienes {clientCount} {clientCount === 1 ? "cliente conectado" : "clientes conectados"}.
      </h2>
      <p className="text-sm text-brand-gray-4 mb-5">
        Conecta el resto de tu cartera y deja listo tu canal de referidos. No vuelves a cargar lo que ya está.
      </p>

      {/* Progreso REAL — cada línea es un hecho verificable, no un paso decorativo */}
      <div className="bg-brand-surface rounded-xl p-4 mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-gray-3 mb-2.5">Tu sistema</p>
        <ul className="space-y-1.5">
          {progress.map((p) => (
            <li key={p.label} className="flex items-center gap-2 text-sm">
              <span className={p.done ? "text-brand-success-ink" : "text-brand-gray-4"}>{p.done ? "✓" : "○"}</span>
              <span className={p.done ? "text-brand-ink" : "text-brand-gray-4"}>{p.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Perfil mínimo: SOLO si falta. Dos preguntas, las únicas que cambian el producto. */}
      {needsProfile && (
        <div className="border border-brand-border-1 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-brand-ink mb-3">Dos datos para dejarlo a tu medida</p>
          <p className="text-[11px] font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">¿Qué vendes principalmente?</p>
          <div className="flex gap-2 mb-4 flex-wrap">
            {["PPR", "Vida", "Ambos"].map((p) => (
              <button
                key={p}
                onClick={() => setProducts(p)}
                className={`text-sm font-medium rounded-full border px-4 py-2 ${products === p ? "bg-brand-ink text-white border-brand-ink" : "bg-white text-brand-gray-2 border-brand-border-4"}`}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">¿Cómo contactas normalmente a tus clientes?</p>
          <div className="flex gap-2 mb-4 flex-wrap">
            {[["whatsapp", "WhatsApp"], ["email", "Email"], ["ambos", "Ambos"]].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setChannel(v)}
                className={`text-sm font-medium rounded-full border px-4 py-2 ${channel === v ? "bg-brand-ink text-white border-brand-ink" : "bg-white text-brand-gray-2 border-brand-border-4"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={saveProfile}
            disabled={!products || !channel || saving}
            className="text-sm font-semibold text-white bg-brand-ink rounded-full px-5 py-2.5 disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/admin/clientes"
          onClick={() => trackEvent("recovery_import_clicked")}
          className="text-sm font-semibold text-white bg-[#2563EB] rounded-full px-5 py-2.5"
        >
          Agregar el resto de mi cartera
        </Link>
        <Link href="/admin/empezar" className="text-sm font-medium text-brand-gray-2 hover:text-brand-ink">
          Activar estos {Math.min(suggestedSize, clientCount)} →
        </Link>
      </div>
      {contactableCount < clientCount && (
        <p className="text-xs text-brand-gray-4 mt-3">
          {clientCount - contactableCount} de tus clientes no tienen teléfono ni correo — a esos no se les puede activar todavía.
        </p>
      )}
    </div>
  );
}
