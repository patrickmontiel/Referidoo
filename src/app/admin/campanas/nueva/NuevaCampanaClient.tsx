"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { renderMessage } from "@/lib/message-templates";

type ClientLite = { id: string; name: string; email: string | null; phone: string | null };

const DEFAULT_TEMPLATE =
  "¡Hola {nombre}! Soy {asesor}.\n\n" +
  "Te comparto tu link personal: por cada amigo o familiar que le pases el link y contrate conmigo, tú ganas premios en efectivo.\n\n" +
  "Échale un ojo aquí:\n{link}";

export default function NuevaCampanaClient({ advisorName, clients }: { advisorName: string; clients: ClientLite[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedClients = useMemo(() => clients.filter((c) => selected.has(c.id)), [clients, selected]);
  const allSelected = clients.length > 0 && selected.size === clients.length;
  const withoutEmail = selectedClients.filter((c) => !c.email).length;
  const withoutPhone = selectedClients.filter((c) => !c.phone).length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(clients.map((c) => c.id)));
  }

  const previewFor = selectedClients[0];
  const preview = renderMessage(template, {
    nombre: previewFor ? previewFor.name.split(" ")[0] : "Ana",
    link: "https://referidoo.com/c/••••••",
    asesor: advisorName || "tu asesor",
  });

  async function launch() {
    setError("");
    setBusy(true);
    try {
      const createRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), channel, messageTemplate: template, clientIds: [...selected] }),
      });
      const created = await createRes.json();
      if (!createRes.ok) { setError(created.error ?? "No se pudo crear la activación"); setBusy(false); return; }
      // Ejecuta (email → envío real; whatsapp → cola en la página de resultados).
      await fetch(`/api/campaigns/${created.campaignId}/send`, { method: "POST" }).catch(() => {});
      router.push(`/admin/campanas/${created.campaignId}`);
    } catch {
      setError("Error de red");
      setBusy(false);
    }
  }

  if (clients.length === 0) {
    return (
      <div className="w-full max-w-[680px]">
        <h1 className="text-2xl font-bold text-brand-ink mb-2">Activar mi cartera</h1>
        <p className="text-sm text-brand-gray-4 mb-6">Primero necesitas clientes en tu cartera para poder activarla.</p>
        <Link href="/admin/clientes" className="inline-block text-sm font-semibold text-white bg-brand-ink rounded-full px-5 py-2.5">Ir a Clientes para agregar o importar →</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[680px]">
      <div className="flex items-center gap-2 mb-1">
        <Link href="/admin/campanas" className="text-sm text-brand-gray-4 hover:text-brand-ink">Activaciones</Link>
        <span className="text-brand-gray-4">/</span>
        <span className="text-sm text-brand-ink font-medium">Activar mi cartera</span>
      </div>
      <h1 className="text-2xl font-bold text-brand-ink mb-1">Activar mi cartera</h1>
      <p className="text-sm text-brand-gray-4 mb-5">Manda a tus clientes su link para que empiecen a referirte. Paso {step} de 3.</p>

      {/* Paso 1 — seleccionar */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-brand-border-1 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-brand-ink">Elige a quién contactar</p>
            <button onClick={toggleAll} className="text-sm font-medium text-brand-blue">{allSelected ? "Quitar todos" : "Seleccionar todos"}</button>
          </div>
          <div className="max-h-[360px] overflow-y-auto -mx-1 px-1 divide-y divide-brand-border-1">
            {clients.map((c) => (
              <label key={c.id} className="flex items-center gap-3 py-2.5 cursor-pointer">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="w-4 h-4 accent-[#2563EB]" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-brand-ink truncate">{c.name}</span>
                  <span className="block text-xs text-brand-gray-4 truncate">{c.email || "sin correo"} · {c.phone || "sin teléfono"}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-border-1">
            <p className="text-sm text-brand-gray-2"><b className="text-brand-ink">{selected.size}</b> clientes seleccionados</p>
            <button disabled={selected.size === 0} onClick={() => setStep(2)} className="text-sm font-semibold text-white bg-brand-ink rounded-full px-5 py-2.5 disabled:opacity-40">Continuar →</button>
          </div>
        </div>
      )}

      {/* Paso 2 — mensaje + canal */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-brand-border-1 p-5 space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">Nombre de la activación</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Cartera septiembre" className="w-full px-4 py-3 rounded-xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">Canal</label>
            <div className="flex gap-2">
              <button onClick={() => setChannel("email")} className={`flex-1 text-sm font-medium rounded-xl border px-4 py-3 ${channel === "email" ? "bg-brand-ink text-white border-brand-ink" : "bg-white text-brand-gray-2 border-brand-border-4"}`}>Email (envío automático)</button>
              <button onClick={() => setChannel("whatsapp")} className={`flex-1 text-sm font-medium rounded-xl border px-4 py-3 ${channel === "whatsapp" ? "bg-brand-ink text-white border-brand-ink" : "bg-white text-brand-gray-2 border-brand-border-4"}`}>WhatsApp (uno por uno)</button>
            </div>
            {channel === "email" && withoutEmail > 0 && <p className="text-xs text-brand-gray-4 mt-2">{withoutEmail} de los seleccionados no tienen correo — a esos no les llegará el email.</p>}
            {channel === "whatsapp" && <p className="text-xs text-brand-gray-4 mt-2">WhatsApp es asistido: abres el chat prellenado de cada cliente y lo mandas tú. {withoutPhone > 0 ? `${withoutPhone} sin teléfono se omiten.` : ""}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">Mensaje · usa {"{nombre}"}, {"{asesor}"} y {"{link}"}</label>
            <textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={6} className="w-full px-4 py-3 rounded-xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink font-mono" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">Vista previa {previewFor ? `(para ${previewFor.name.split(" ")[0]})` : ""}</p>
            <div className="bg-brand-surface rounded-xl p-4 text-sm text-brand-gray-1 whitespace-pre-wrap">{preview}</div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <button onClick={() => setStep(1)} className="text-sm text-brand-gray-4">← Atrás</button>
            <button disabled={!name.trim() || !template.trim()} onClick={() => setStep(3)} className="text-sm font-semibold text-white bg-brand-ink rounded-full px-5 py-2.5 disabled:opacity-40">Revisar →</button>
          </div>
        </div>
      )}

      {/* Paso 3 — revisar + ejecutar */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-brand-border-1 p-5">
          <p className="text-sm font-semibold text-brand-ink mb-4">Confirma antes de activar</p>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-brand-gray-4">Activación</dt><dd className="text-brand-ink font-medium">{name}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-gray-4">Canal</dt><dd className="text-brand-ink font-medium">{channel === "email" ? "Email (automático)" : "WhatsApp (asistido)"}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-gray-4">Clientes</dt><dd className="text-brand-ink font-medium">{selected.size}</dd></div>
          </dl>
          {error && <p className="text-brand-danger-ink text-sm mt-4">{error}</p>}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-brand-border-1">
            <button onClick={() => setStep(2)} className="text-sm text-brand-gray-4" disabled={busy}>← Atrás</button>
            <button onClick={launch} disabled={busy} className="text-sm font-semibold text-white bg-[#2563EB] rounded-full px-6 py-2.5 disabled:opacity-50">
              {busy ? "Activando…" : channel === "email" ? "Activar y enviar" : "Activar y preparar envíos"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
