"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Tour, type TourStep } from "@/components/Tour";

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="actions"]',
    title: "Agrega tus clientes",
    body: "Un cliente a la vez con el botón negro, o importa un CSV completo de golpe. Cada cliente recibe su portal personalizado con link de referidos.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="client-list"]',
    title: "Tus clientes activos",
    body: "Cada tarjeta muestra cuántos referidos ha mandado ese cliente y cuántos convirtieron. Dale WhatsApp para recordarle su link.",
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
  referrals: {
    rewardAmount: number;
    rewardStatus: string;
    status: string;
    tierPosition: number;
    productType?: string | null;
    interestProductType?: string | null;
  }[];
  bubbleClaims: { amount: number; status: string }[];
};

type Advisor = { name: string; companyName: string | null };
type CsvRow = { name: string; phone: string; email: string; policyNumber: string };
type ImportResult = { name: string; ok: boolean; error?: string };

const SORT_MODES = ["converted", "referrals", "name"] as const;
type SortMode = typeof SORT_MODES[number];
const SORT_LABELS: Record<SortMode, string> = {
  converted: "Más convertidos",
  referrals: "Más referidos",
  name: "Nombre (A–Z)",
};

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

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
  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      return {
        name: cols[colMap.name ?? 0] ?? "",
        phone: cols[colMap.phone ?? -1] ?? "",
        email: cols[colMap.email ?? -1] ?? "",
        policyNumber: cols[colMap.policyNumber ?? -1] ?? "",
      };
    })
    .filter((r) => r.name);
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("converted");
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);

  function load() {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/advisor/me").then((r) => r.json()),
      fetch("/api/tiers").then((r) => r.json()),
    ])
      .then(([clientsData, advData, tiersData]) => {
        setClients(Array.isArray(clientsData) ? clientsData : []);
        if (advData?.name) setAdvisor(advData);
        if (tiersData?.tiers?.length) {
          setMaxTierAmount(Math.max(...tiersData.tiers.map((t: { amount: number }) => t.amount)));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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

  function cycleSortMode() {
    setSortMode((m) => {
      const idx = SORT_MODES.indexOf(m);
      return SORT_MODES[(idx + 1) % SORT_MODES.length];
    });
  }

  const activeClients = clients.filter((c) => c.active);

  const sorted = [...activeClients].sort((a, b) => {
    const ac = a.referrals.filter((r) => r.status === "converted").length;
    const bc = b.referrals.filter((r) => r.status === "converted").length;
    if (sortMode === "converted") return bc - ac;
    if (sortMode === "referrals") return b._count.referrals - a._count.referrals;
    return a.name.localeCompare(b.name, "es");
  });

  return (
    <div className="max-w-2xl">
      {showTour && <Tour steps={TOUR_STEPS} onDone={() => setShowTour(false)} />}
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-ink">Clientes</h1>
        <p className="text-sm text-brand-gray-4 mt-0.5">
          {activeClients.length} clientes activos · cada uno con su link de referido
        </p>
      </div>

      {/* Actions */}
      <div data-tour="actions" className="flex items-center gap-3 mb-6">
        <button
          onClick={cycleSortMode}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#DADCE0] text-[#0B0B0C] text-sm font-medium hover:bg-[#F4F5F7] transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#6B727D]">
            <path d="M7 16V4M7 4L4 7M7 4L10 7M17 8V20M17 20L14 17M17 20L20 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Ordenar: {SORT_LABELS[sortMode]}
        </button>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#0B0B0C] text-white text-sm px-5 py-2.5 rounded-full hover:bg-[#26262a] transition font-medium"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Agregar cliente
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-full border border-[#DADCE0] text-[#6B727D] hover:bg-[#F4F5F7] transition"
          title="Importar CSV"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          CSV
        </button>
      </div>

      {/* CSV preview */}
      {csvRows && csvRows.length > 0 && (
        <div className="bg-white border border-brand-border-1 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">{csvRows.length} clientes listos para importar</h2>
            <button onClick={() => setCsvRows(null)} className="text-brand-gray-4 hover:text-brand-gray-1 text-lg leading-none p-1 -m-1 transition">×</button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
            {csvRows.map((row, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-brand-border-2 last:border-0">
                <span className="w-5 h-5 bg-brand-border-1 rounded-full flex items-center justify-center text-[10px] font-semibold text-brand-gray-4 flex-shrink-0">{i + 1}</span>
                <span className="font-medium flex-1 truncate">{row.name}</span>
                {row.phone && <span className="text-brand-gray-4 text-xs">{row.phone}</span>}
              </div>
            ))}
          </div>
          <button
            onClick={runImport}
            disabled={importing}
            className="w-full bg-brand-ink text-white text-sm py-2.5 rounded-full font-medium hover:bg-[#26262a] disabled:opacity-50 transition"
          >
            {importing ? "Importando..." : `Importar ${csvRows.length} clientes`}
          </button>
        </div>
      )}

      {/* Import results */}
      {importResults && (
        <div className="bg-white border border-brand-border-1 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">
              {importResults.filter((r) => r.ok).length} importados
              {importResults.filter((r) => !r.ok).length > 0 && ` · ${importResults.filter((r) => !r.ok).length} con error`}
            </h2>
            <button onClick={() => setImportResults(null)} className="text-brand-gray-4 hover:text-brand-gray-1 text-lg leading-none p-1 -m-1 transition">×</button>
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {importResults.filter((r) => !r.ok).map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-red-600">
                <span>✗</span><span>{r.name} — {r.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New client form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-brand-border-1 rounded-2xl p-5 mb-5 space-y-4">
          <h2 className="font-semibold text-[#0B0B0C]">Nuevo cliente</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-brand-gray-4 mb-1.5 uppercase tracking-wide">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Nombre completo"
                className="w-full px-3 py-2.5 rounded-xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-gray-4 mb-1.5 uppercase tracking-wide">Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="55 1234 5678"
                className="w-full px-3 py-2.5 rounded-xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-gray-4 mb-1.5 uppercase tracking-wide">Correo</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2.5 rounded-xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-brand-gray-4 mb-1.5 uppercase tracking-wide">No. de póliza</label>
              <input
                type="text"
                value={form.policyNumber}
                onChange={(e) => setForm({ ...form, policyNumber: e.target.value })}
                placeholder="Opcional"
                className="w-full px-3 py-2.5 rounded-xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition"
              />
            </div>
          </div>
          {createError && <p className="text-red-500 text-xs px-1">{createError}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-brand-ink text-white text-sm py-2.5 rounded-full font-medium hover:bg-[#26262a] disabled:opacity-50 transition"
            >
              {submitting ? "Guardando..." : "Crear cliente"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 text-sm py-2.5 rounded-full border border-brand-border-4 text-brand-gray-2 hover:bg-brand-surface transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-brand-gray-4">
          <p className="text-sm">Agrega tu primer cliente para comenzar.</p>
        </div>
      ) : (
        <div data-tour="client-list" className="space-y-3">
          {sorted.map((client) => {
            const converted = client.referrals.filter((r) => r.status === "converted").length;
            const referralCount = client._count.referrals;
            const mainProduct: string | null =
              client.referrals.find((r) => r.status === "converted" && r.productType)?.productType ??
              client.referrals.find((r) => r.interestProductType)?.interestProductType ??
              null;

            const clientStatus =
              converted > 0 ? "activo" : referralCount > 0 ? "en_proceso" : "sin_referidos";
            const statusConfig = {
              activo:        { label: "Activo",        style: "bg-green-50 text-green-700" },
              en_proceso:    { label: "En proceso",    style: "bg-amber-50 text-amber-700" },
              sin_referidos: { label: "Sin referidos", style: "bg-[#F4F5F7] text-[#6B727D]" },
            } as const;

            const base = typeof window !== "undefined" ? window.location.origin : "";
            const portalLink = `${base}/c/${client.accessToken}`;

            return (
              <div key={client.id} className="bg-white rounded-2xl border border-brand-border-1 p-5">
                {/* Top row */}
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-[#F4F5F7] flex items-center justify-center text-sm font-semibold text-[#3F4651] flex-shrink-0">
                    {getInitials(client.name)}
                  </div>
                  {/* Name + product */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#0B0B0C] text-[15px] leading-snug truncate">{client.name}</p>
                    {mainProduct && <p className="text-xs text-brand-gray-4 mt-0.5">{mainProduct}</p>}
                  </div>
                  {/* Stats */}
                  <div className="flex gap-5 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-xl font-bold text-[#0B0B0C] leading-none">{referralCount}</p>
                      <p className="text-[10px] text-brand-gray-4 mt-1">Referidos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-[#0B0B0C] leading-none">{converted}</p>
                      <p className="text-[10px] text-brand-gray-4 mt-1">Convertidos</p>
                    </div>
                  </div>
                  {/* Status pill */}
                  <span className={`text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0 ${statusConfig[clientStatus].style}`}>
                    {statusConfig[clientStatus].label}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-4">
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
                    className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#22C55E] text-white text-sm py-2.5 rounded-full transition font-semibold"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => copyLink(client)}
                    className="flex-1 flex items-center justify-center text-sm py-2.5 rounded-full border border-[#DADCE0] text-[#0B0B0C] hover:bg-[#F4F5F7] transition font-medium"
                  >
                    {copiedId === client.id ? "¡Copiado!" : "Copiar link"}
                  </button>
                </div>

                {/* Deactivate (subtle) */}
                <div className="mt-3 pt-3 border-t border-brand-border-1 flex items-center justify-between">
                  <p className="text-xs text-brand-gray-4">Desde {formatDate(client.createdAt)}</p>
                  {deactivateId === client.id ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-brand-gray-4">¿Desactivar?</p>
                      <button onClick={() => deactivate(client.id)} className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition font-medium">
                        Confirmar
                      </button>
                      <button onClick={() => setDeactivateId(null)} className="text-xs text-brand-gray-4 hover:text-brand-gray-2 transition">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeactivateId(client.id)} className="text-xs text-brand-gray-4 hover:text-red-400 transition">
                      Desactivar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
