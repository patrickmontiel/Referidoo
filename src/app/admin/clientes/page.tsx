"use client";

import { useEffect, useRef, useState } from "react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Tour, type TourStep } from "@/components/Tour";

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="actions"]',
    title: "Agrega tus clientes",
    body: "Un cliente a la vez con el botón negro, o importa un CSV completo de golpe. Cada cliente recibe su portal personalizado con link de referidos.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="search"]',
    title: "Búsqueda rápida",
    body: "Cuando tengas muchos clientes, filtra por nombre aquí. Ideal para encontrar a alguien específico antes de mandarle su invitación.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="client-list"]',
    title: "Tus clientes activos",
    body: "Cada tarjeta muestra cuántos referidos ha mandado ese cliente, cuántos convirtieron y cuánto ha ganado en premios hasta hoy.",
    placement: "top",
  },
];

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  policyNumber: string | null;
  referralCode: string;
  accessToken: string;
  active: boolean;
  createdAt: string;
  _count: { referrals: number };
  referrals: { rewardAmount: number; rewardStatus: string; status: string; tierPosition: number }[];
  bubbleClaims: { amount: number; status: string }[];
};

type Advisor = { name: string; companyName: string | null };
type CsvRow = { name: string; phone: string; email: string; policyNumber: string };
type ImportResult = { name: string; ok: boolean; error?: string };

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-záéíóúñ]/gi, ""));
  const colMap: Record<string, number> = {};
  header.forEach((h, i) => {
    if (/nombre|name/.test(h)) colMap.name = i;
    else if (/tel|phone|celular|movil|móvil/.test(h)) colMap.phone = i;
    else if (/correo|email|mail/.test(h)) colMap.email = i;
    else if (/poliz|policy/.test(h)) colMap.policyNumber = i;
  });
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return {
      name: cols[colMap.name ?? 0] ?? "",
      phone: cols[colMap.phone ?? -1] ?? "",
      email: cols[colMap.email ?? -1] ?? "",
      policyNumber: cols[colMap.policyNumber ?? -1] ?? "",
    };
  }).filter((r) => r.name);
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [maxTierAmount, setMaxTierAmount] = useState(3500);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", policyNumber: "" });
  const [submitting, setSubmitting] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [createError, setCreateError] = useState("");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  // CSV import
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);

  function load() {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/advisor/me").then((r) => r.json()),
      fetch("/api/tiers").then((r) => r.json()),
    ]).then(([clientsData, advData, tiersData]) => {
      setClients(Array.isArray(clientsData) ? clientsData : []);
      if (advData?.name) setAdvisor(advData);
      if (tiersData?.tiers?.length) {
        setMaxTierAmount(Math.max(...tiersData.tiers.map((t: { amount: number }) => t.amount)));
      }
    }).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const handler = () => setShowTour(true);
    window.addEventListener("referidoo:tour", handler);
    return () => window.removeEventListener("referidoo:tour", handler);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setCreateError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ name: "", email: "", phone: "", policyNumber: "" });
        setShowForm(false);
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.error ?? "Error al crear el cliente. Intenta de nuevo.");
      }
    } catch {
      setCreateError("Sin conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCsv(ev.target?.result as string);
      setCsvRows(rows);
      setImportResults(null);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  async function runImport() {
    if (!csvRows?.length) return;
    setImporting(true);
    const res = await fetch("/api/clients/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: csvRows }),
    });
    const data = await res.json();
    setImportResults(data.results);
    setCsvRows(null);
    setImporting(false);
    load();
  }

  async function deactivate(id: string) {
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    setDeactivateId(null);
    load();
  }

  function copyLink(client: Client) {
    const base = window.location.origin;
    navigator.clipboard.writeText(`${base}/c/${client.accessToken}`);
    setCopiedId(client.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = clients.filter((c) =>
    c.active && c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl">
      {showTour && <Tour steps={TOUR_STEPS} onDone={() => setShowTour(false)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="text-sm text-gray-400 mt-0.5">{clients.filter((c) => c.active).length} activos</p>
        </div>
        <div data-tour="actions" className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition font-medium"
            title="Importar CSV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            CSV
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-black text-white text-sm px-4 py-2 rounded-xl hover:bg-gray-900 transition font-medium"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* CSV preview */}
      {csvRows && csvRows.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">{csvRows.length} clientes listos para importar</h2>
            <button onClick={() => setCsvRows(null)} className="text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
            {csvRows.map((row, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-50 last:border-0">
                <span className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-semibold text-gray-500 flex-shrink-0">{i + 1}</span>
                <span className="font-medium flex-1 truncate">{row.name}</span>
                {row.phone && <span className="text-gray-400 text-xs">{row.phone}</span>}
              </div>
            ))}
          </div>
          <button
            onClick={runImport}
            disabled={importing}
            className="w-full bg-black text-white text-sm py-2.5 rounded-xl font-medium hover:bg-gray-900 disabled:opacity-50 transition"
          >
            {importing ? "Importando..." : `Importar ${csvRows.length} clientes`}
          </button>
        </div>
      )}

      {/* Import results */}
      {importResults && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">
              {importResults.filter(r => r.ok).length} importados
              {importResults.filter(r => !r.ok).length > 0 && ` · ${importResults.filter(r => !r.ok).length} con error`}
            </h2>
            <button onClick={() => setImportResults(null)} className="text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {importResults.filter(r => !r.ok).map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-red-600">
                <span>✗</span><span>{r.name} — {r.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New client form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 space-y-4"
        >
          <h2 className="font-medium text-sm">Nuevo cliente</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Nombre completo"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black transition"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="55 1234 5678"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black transition"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Correo</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black transition"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">No. de póliza</label>
              <input
                type="text"
                value={form.policyNumber}
                onChange={(e) => setForm({ ...form, policyNumber: e.target.value })}
                placeholder="Opcional"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black transition"
              />
            </div>
          </div>
          {createError && (
            <p className="text-red-500 text-xs px-1">{createError}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-black text-white text-sm py-2.5 rounded-xl font-medium hover:bg-gray-900 disabled:opacity-50 transition"
            >
              {submitting ? "Guardando..." : "Crear cliente"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 text-sm py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div data-tour="search" className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.134 17 3 13.866 3 10C3 6.134 6.134 3 10 3C13.866 3 17 6.134 17 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition bg-white"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">{search ? "Sin resultados" : "Agrega tu primer cliente para comenzar."}</p>
        </div>
      ) : (
        <div data-tour="client-list" className="space-y-3">
          {filtered.map((client) => {
            // Escalera (Vida/PPR): premios que avanzan en niveles, identificados por tierPosition > 0
            const escaleraPagado = client.referrals
              .filter(r => r.tierPosition > 0 && r.rewardStatus === "paid")
              .reduce((s, r) => s + r.rewardAmount, 0);
            const escaleraDebido = client.referrals
              .filter(r => r.status === "converted" && r.tierPosition > 0 && r.rewardStatus !== "paid")
              .reduce((s, r) => s + r.rewardAmount, 0);
            // Premios burbuja: Auto, GMM y Otro acumulan a un pool reclamable aparte
            const burbujaPagado = client.bubbleClaims
              .filter(c => c.status === "paid")
              .reduce((s, c) => s + c.amount, 0);
            const burbujaDebido = client.bubbleClaims
              .filter(c => c.status === "pending")
              .reduce((s, c) => s + c.amount, 0);
            const totalPagado = escaleraPagado + burbujaPagado;
            const converted = client.referrals.filter(r => r.status === "converted").length;
            const base = typeof window !== "undefined" ? window.location.origin : "";
            const portalLink = `${base}/c/${client.accessToken}`;

            return (
              <div key={client.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{client.name}</p>
                        {client.phone && <p className="text-xs text-gray-400">{client.phone}</p>}
                      </div>
                    </div>
                  </div>
                  {deactivateId === client.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => deactivate(client.id)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition font-medium"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setDeactivateId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeactivateId(client.id)}
                      className="text-gray-300 hover:text-red-400 transition p-1"
                      title="Desactivar"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <p className="text-base font-semibold">{client._count.referrals}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Referidos</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <p className="text-base font-semibold">{converted}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Convertidos</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <p className="text-base font-semibold">{formatCurrency(totalPagado)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Pagado</p>
                  </div>
                </div>

                {(escaleraDebido > 0 || escaleraPagado > 0 || burbujaDebido > 0 || burbujaPagado > 0) && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-gray-100 p-2.5">
                      <p className="text-[10px] text-gray-400 mb-1.5">Escalera · Vida y PPR</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-amber-600">Por pagar</span>
                        <span className="text-xs font-semibold text-amber-600">{formatCurrency(escaleraDebido)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-green-600">Pagado</span>
                        <span className="text-xs font-semibold text-green-600">{formatCurrency(escaleraPagado)}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-2.5">
                      <p className="text-[10px] text-gray-400 mb-1.5">Premios burbuja</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-amber-600">Por pagar</span>
                        <span className="text-xs font-semibold text-amber-600">{formatCurrency(burbujaDebido)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-green-600">Pagado</span>
                        <span className="text-xs font-semibold text-green-600">{formatCurrency(burbujaPagado)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-50 space-y-2">
                  {/* WhatsApp — primary action */}
                  <button
                    onClick={() => {
                      const firstName = client.name.split(" ")[0];
                      const advisorName = advisor?.name ?? "tu asesor";
                      const msg = `¡Hola ${firstName}! 👋 Habla ${advisorName}.\n\nQuiero invitarte a mi programa de referidos. Si compartes tu link personal con amigos o familiares y alguno contrata un plan, tú ganas en efectivo — hasta ${formatCurrency(maxTierAmount)} por referido.\n\nEntra aquí, tarda menos de un minuto:\n${portalLink}`;
                      const phone = client.phone
                        ? "52" + client.phone.replace(/\D/g, "").replace(/^(52|1)/, "")
                        : "";
                      const url = phone
                        ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
                        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                      window.open(url, "_blank");
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm py-2.5 rounded-xl transition font-medium"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    Enviar invitación por WhatsApp
                  </button>

                  {/* Secondary: copy + view */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyLink(client)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                    >
                      {copiedId === client.id ? "¡Copiado!" : "Copiar link"}
                    </button>
                    <a
                      href={portalLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                    >
                      Ver dashboard
                    </a>
                  </div>
                </div>

                {client.policyNumber && (
                  <p className="text-xs text-gray-300 mt-2">Póliza: {client.policyNumber}</p>
                )}
                <p className="text-xs text-gray-300 mt-0.5">Desde {formatDate(client.createdAt)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
