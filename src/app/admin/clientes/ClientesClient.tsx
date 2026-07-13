"use client";

import { useRef, useState } from "react";
import { formatCurrency, formatDate, REWARD_CUTOFF_DAYS } from "@/lib/utils";

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
    rewardApprovedAt?: string | null;
  }[];
  bubbleClaims: { amount: number; status: string; createdAt?: string }[];
  bubblePoints: number;
};

// Corte obligatorio: el asesor tiene REWARD_CUTOFF_DAYS para pagarle el premio
// a su cliente desde que se aprueba (escalera) o desde que lo reclama (burbuja).
type Owed = { total: number; deadline: number | null; overdue: boolean; daysLeft: number | null };

function computeOwed(client: Client): Owed {
  const now = Date.now();
  const cutoffMs = REWARD_CUTOFF_DAYS * 24 * 60 * 60 * 1000;
  const dueDates: number[] = [];
  let total = 0;
  for (const r of client.referrals) {
    if (r.rewardStatus === "approved" && r.tierPosition > 0) {
      total += r.rewardAmount;
      if (r.rewardApprovedAt) dueDates.push(new Date(r.rewardApprovedAt).getTime() + cutoffMs);
    }
  }
  for (const b of client.bubbleClaims) {
    if (b.status === "pending") {
      total += b.amount;
      if (b.createdAt) dueDates.push(new Date(b.createdAt).getTime() + cutoffMs);
    }
  }
  const deadline = dueDates.length ? Math.min(...dueDates) : null;
  const overdue = deadline !== null && now > deadline;
  const daysLeft = deadline !== null ? Math.ceil((deadline - now) / (24 * 60 * 60 * 1000)) : null;
  return { total, deadline, overdue, daysLeft };
}

function owedLabel(o: Owed): string {
  const money = formatCurrency(o.total);
  if (o.deadline === null) return `Debe ${money}`;
  if (o.overdue) return `Debe ${money} · vencido ${Math.abs(o.daysLeft ?? 0)}d`;
  if ((o.daysLeft ?? 0) <= 0) return `Debe ${money} · vence hoy`;
  return `Debe ${money} · ${o.daysLeft}d`;
}

type Advisor = { name: string; companyName: string | null };
type CsvRow = { name: string; phone: string; email: string; policyNumber: string };
type ImportResult = { name: string; ok: boolean; error?: string };

const SORT_MODES = ["debe", "converted", "referrals", "name"] as const;
type SortMode = typeof SORT_MODES[number];
const SORT_LABELS: Record<SortMode, string> = {
  debe:      "Se le debe",
  converted: "Más convertidos",
  referrals: "Más referidos",
  name:      "Nombre (A–Z)",
};

const statusConfig = {
  activo:        { label: "Activo",        style: "bg-green-50 text-green-700" },
  en_proceso:    { label: "En proceso",    style: "bg-amber-50 text-amber-700" },
  sin_referidos: { label: "Sin referidos", style: "bg-[#F4F5F7] text-[#6B727D]" },
} as const;

type ClientStatus = keyof typeof statusConfig;

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function normHeader(h: string) {
  return h.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  // Detect delimiter: semicolon (common in Spanish Excel) or comma
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const rawHeaders = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ""));
  const headers = rawHeaders.map(normHeader);
  const colMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    if (!colMap.name         && /(nombre|name|cliente|contacto)/.test(h)) colMap.name = i;
    else if (!colMap.phone   && /(tel|phone|celular|movil|cel|numero)/.test(h)) colMap.phone = i;
    else if (!colMap.email   && /(correo|email|mail)/.test(h)) colMap.email = i;
    else if (!colMap.policyNumber && /(poliz|poliza|policy|numpol|nopdliza|ndpoliza|poliza|polz)/.test(h)) colMap.policyNumber = i;
  });
  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const cols = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
      return {
        name:         cols[colMap.name ?? 0] ?? "",
        phone:        colMap.phone    != null ? (cols[colMap.phone]    ?? "") : "",
        email:        colMap.email    != null ? (cols[colMap.email]    ?? "") : "",
        policyNumber: colMap.policyNumber != null ? (cols[colMap.policyNumber] ?? "") : "",
      };
    })
    .filter((r) => r.name);
}

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

type ClientesClientProps = {
  initialClients: Client[];
  initialAdvisor: Advisor | null;
  initialMaxTierAmount: number;
};

export default function ClientesClient({ initialClients, initialAdvisor, initialMaxTierAmount }: ClientesClientProps) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [advisor, setAdvisor] = useState<Advisor | null>(initialAdvisor);
  const [maxTierAmount, setMaxTierAmount] = useState(initialMaxTierAmount);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", policyNumber: "" });
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", policyNumber: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("debe");
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);

  function load() {
    fetch("/api/admin/clients-data")
      .then((r) => r.json())
      .then((data) => {
        setClients(Array.isArray(data.clients) ? data.clients : []);
        if (data.advisor?.name) setAdvisor(data.advisor);
        if (Array.isArray(data.tiers) && data.tiers.length) {
          setMaxTierAmount(Math.max(...data.tiers.map((t: { amount: number }) => t.amount)));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

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
        setCreateError(data.error ?? "Error al crear el cliente.");
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

  function openEdit(client: Client) {
    setEditingClient(client);
    setEditForm({ name: client.name, email: client.email ?? "", phone: client.phone ?? "", policyNumber: client.policyNumber ?? "" });
    setEditError("");
    setMenuOpenId(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingClient) return;
    setEditSubmitting(true);
    setEditError("");
    try {
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingClient(null);
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error ?? "Error al guardar");
      }
    } catch {
      setEditError("Sin conexión. Intenta de nuevo.");
    } finally {
      setEditSubmitting(false);
    }
  }

  function copyLink(client: Client) {
    const base = window.location.origin;
    navigator.clipboard.writeText(`${base}/c/${client.accessToken}`);
    setCopiedId(client.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function buildWhatsAppUrl(client: Client) {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const portalLink = `${base}/c/${client.accessToken}`;
    const firstName = client.name.split(" ")[0];
    const advisorName = advisor?.name ?? "tu asesor";
    const msg = `¡Hola ${firstName}! 👋 Habla ${advisorName}.\n\nQuiero invitarte a mi programa de referidos. Si compartes tu link con amigos y alguno contrata un plan, tú ganas en efectivo — hasta ${formatCurrency(maxTierAmount)} por referido.\n\nEntra aquí:\n${portalLink}`;
    const phone = client.phone ? "52" + client.phone.replace(/\D/g, "").replace(/^(52|1)/, "") : "";
    return phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  function cycleSortMode() {
    setSortMode((m) => {
      const idx = SORT_MODES.indexOf(m);
      return SORT_MODES[(idx + 1) % SORT_MODES.length];
    });
  }

  const activeClients = clients.filter((c) => c.active);

  // Resumen de deuda: a cuántos clientes se les debe, cuánto, y cuántos vencidos.
  const owedSummary = activeClients.reduce(
    (acc, c) => {
      const o = computeOwed(c);
      if (o.total > 0) {
        acc.count += 1;
        acc.total += o.total;
        if (o.overdue) acc.overdue += 1;
      }
      return acc;
    },
    { count: 0, total: 0, overdue: 0 }
  );

  const sorted = [...activeClients].sort((a, b) => {
    const ac = a.referrals.filter((r) => r.status === "converted").length;
    const bc = b.referrals.filter((r) => r.status === "converted").length;
    if (sortMode === "debe") {
      const oa = computeOwed(a);
      const ob = computeOwed(b);
      const aOwed = oa.total > 0 ? 1 : 0;
      const bOwed = ob.total > 0 ? 1 : 0;
      if (aOwed !== bOwed) return bOwed - aOwed; // los que deben, primero
      if (aOwed && bOwed) {
        const da = oa.deadline ?? Infinity;
        const dbb = ob.deadline ?? Infinity;
        if (da !== dbb) return da - dbb; // vencidos y por vencer primero
        return ob.total - oa.total;
      }
      return bc - ac; // sin deuda: por convertidos
    }
    if (sortMode === "converted") return bc - ac;
    if (sortMode === "referrals") return b._count.referrals - a._count.referrals;
    return a.name.localeCompare(b.name, "es");
  });

  const sortIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0" style={{ color: "#6B727D" }}>
      <path d="M7 16V4M7 4L4 7M7 4L10 7M17 8V20M17 20L14 17M17 20L20 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div className="w-full">
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

      {/* ── Mobile header ── */}
      <div className="md:hidden mb-5">
        <h1 className="text-2xl font-bold text-[#0B0B0C]">Clientes</h1>
        <p className="text-sm mt-0.5" style={{ color: "#6B727D" }}>
          {activeClients.length} clientes activos · cada uno con su link de referido
        </p>
        <div data-tour="actions" className="flex items-center gap-3 mt-4">
          <button
            data-tour="sort"
            onClick={cycleSortMode}
            className="flex-1 flex items-center gap-2 px-4 py-3 rounded-full border border-[#DADCE0] text-[#0B0B0C] text-sm font-medium"
          >
            {sortIcon}
            Ordenar:&nbsp;<span className="truncate">{SORT_LABELS[sortMode]}</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-12 h-12 rounded-full bg-[#0B0B0C] text-white flex items-center justify-center text-2xl font-light flex-shrink-0 hover:bg-[#26262a] transition"
            aria-label="Agregar cliente"
          >
            +
          </button>
        </div>
      </div>

      {/* ── Desktop header ── */}
      <div className="hidden md:flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B0B0C]">Clientes</h1>
          <p className="text-sm mt-0.5" style={{ color: "#6B727D" }}>
            {activeClients.length} clientes activos · cada uno con su link de referido
          </p>
        </div>
        <div data-tour="actions" className="flex items-center gap-3 flex-shrink-0">
          <button
            data-tour="sort"
            onClick={cycleSortMode}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#DADCE0] text-[#0B0B0C] text-sm font-medium hover:bg-[#F4F5F7] transition whitespace-nowrap"
          >
            {sortIcon}
            Ordenar: {SORT_LABELS[sortMode]}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-[#0B0B0C] text-white text-sm px-5 py-2.5 rounded-full hover:bg-[#26262a] transition font-medium whitespace-nowrap"
          >
            + Agregar cliente
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs px-3 py-2.5 rounded-full border border-[#DADCE0] hover:bg-[#F4F5F7] transition flex-shrink-0"
            style={{ color: "#6B727D" }}
            title="Importar CSV"
          >
            CSV
          </button>
        </div>
      </div>

      {/* Resumen de deuda con corte obligatorio */}
      {owedSummary.count > 0 && (
        <div
          className={`rounded-2xl border p-4 mb-4 flex items-start gap-3 ${
            owedSummary.overdue > 0 ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              owedSummary.overdue > 0 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v5M12 16h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${owedSummary.overdue > 0 ? "text-red-700" : "text-amber-800"}`}>
              Le debes a {owedSummary.count} cliente{owedSummary.count !== 1 ? "s" : ""} · {formatCurrency(owedSummary.total)}
            </p>
            <p className={`text-xs mt-0.5 ${owedSummary.overdue > 0 ? "text-red-600" : "text-amber-700"}`}>
              {owedSummary.overdue > 0
                ? `${owedSummary.overdue} vencido${owedSummary.overdue !== 1 ? "s" : ""} — el corte obligatorio es de ${REWARD_CUTOFF_DAYS} días para pagarle a tu cliente.`
                : `Tienes un corte obligatorio de ${REWARD_CUTOFF_DAYS} días para pagar cada premio desde que se aprueba.`}
            </p>
          </div>
        </div>
      )}

      {/* CSV preview */}
      {csvRows && csvRows.length > 0 && (
        <div className="bg-white border border-[#ECEDEF] rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">{csvRows.length} clientes listos para importar</h2>
            <button onClick={() => setCsvRows(null)} className="text-lg leading-none" style={{ color: "#9098A2" }}>×</button>
          </div>
          <div className="space-y-0 max-h-52 overflow-y-auto mb-4">
            {csvRows.map((row, i) => {
              const meta = [row.phone, row.email, row.policyNumber].filter(Boolean);
              return (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b border-[#ECEDEF] last:border-0">
                  <span className="w-5 h-5 bg-[#ECEDEF] rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 mt-0.5" style={{ color: "#9098A2" }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#0B0B0C" }}>{row.name}</p>
                    {meta.length > 0 && (
                      <p className="text-xs truncate mt-0.5" style={{ color: "#9098A2" }}>{meta.join(" · ")}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={runImport} disabled={importing} className="w-full bg-[#0B0B0C] text-white text-sm py-2.5 rounded-full font-medium hover:bg-[#26262a] disabled:opacity-50 transition">
            {importing ? "Importando..." : `Importar ${csvRows.length} clientes`}
          </button>
        </div>
      )}

      {/* Import results */}
      {importResults && (
        <div className="bg-white border border-[#ECEDEF] rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">
              {importResults.filter((r) => r.ok).length} importados
              {importResults.filter((r) => !r.ok).length > 0 && ` · ${importResults.filter((r) => !r.ok).length} con error`}
            </h2>
            <button onClick={() => setImportResults(null)} className="text-lg leading-none" style={{ color: "#9098A2" }}>×</button>
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
        <form onSubmit={handleCreate} className="bg-white border border-[#ECEDEF] rounded-2xl p-5 mb-4 space-y-4">
          <h2 className="font-semibold text-[#0B0B0C]">Nuevo cliente</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs mb-1.5 uppercase tracking-wide" style={{ color: "#9098A2" }}>Nombre *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nombre completo"
                className="w-full px-3 py-2.5 rounded-xl border border-[#DADCE0] text-sm focus:outline-none focus:ring-2 focus:ring-[#0B0B0C] transition" />
            </div>
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-wide" style={{ color: "#9098A2" }}>Teléfono</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="55 1234 5678"
                className="w-full px-3 py-2.5 rounded-xl border border-[#DADCE0] text-sm focus:outline-none focus:ring-2 focus:ring-[#0B0B0C] transition" />
            </div>
            <div>
              <label className="block text-xs mb-1.5 uppercase tracking-wide" style={{ color: "#9098A2" }}>Correo</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2.5 rounded-xl border border-[#DADCE0] text-sm focus:outline-none focus:ring-2 focus:ring-[#0B0B0C] transition" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs mb-1.5 uppercase tracking-wide" style={{ color: "#9098A2" }}>No. de póliza</label>
              <input type="text" value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} placeholder="Opcional"
                className="w-full px-3 py-2.5 rounded-xl border border-[#DADCE0] text-sm focus:outline-none focus:ring-2 focus:ring-[#0B0B0C] transition" />
            </div>
          </div>
          {createError && <p className="text-red-500 text-xs">{createError}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={submitting} className="flex-1 bg-[#0B0B0C] text-white text-sm py-2.5 rounded-full font-medium hover:bg-[#26262a] disabled:opacity-50 transition">
              {submitting ? "Guardando..." : "Crear cliente"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 text-sm py-2.5 rounded-full border border-[#DADCE0] hover:bg-[#F4F5F7] transition" style={{ color: "#6B727D" }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-[#0B0B0C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: "#9098A2" }}>Agrega tu primer cliente para comenzar.</div>
      ) : (
        <div data-tour="client-list" className="space-y-3">
          {sorted.map((client) => {
            const conv = client.referrals.filter((r) => r.status === "converted").length;
            const refCount = client._count.referrals;
            const owed = computeOwed(client);
            const mainProduct: string | null =
              client.referrals.find((r) => r.status === "converted" && r.productType)?.productType ??
              client.referrals.find((r) => r.interestProductType)?.interestProductType ??
              null;

            const clientStatus: ClientStatus = conv > 0 ? "activo" : refCount > 0 ? "en_proceso" : "sin_referidos";
            const { label: statusLabel, style: statusStyle } = statusConfig[clientStatus];
            const waUrl = buildWhatsAppUrl(client);
            const pendingReward = client.referrals
              .filter((r) => r.rewardStatus === "approved" && r.tierPosition > 0)
              .reduce((s, r) => s + r.rewardAmount, 0);
            const paidReward = client.referrals
              .filter((r) => r.rewardStatus === "paid" && r.tierPosition > 0)
              .reduce((s, r) => s + r.rewardAmount, 0);
            const pendingBubble = client.bubbleClaims
              .filter((c) => c.status === "pending")
              .reduce((s, c) => s + c.amount, 0);
            const paidBubble = client.bubbleClaims
              .filter((c) => c.status === "paid")
              .reduce((s, c) => s + c.amount, 0);
            const totalOwed = pendingReward + pendingBubble;
            const totalPaid = paidReward + paidBubble;

            const avatar = (
              <div className="w-11 h-11 rounded-full bg-[#F4F5F7] flex items-center justify-center text-sm font-semibold text-[#3F4651] flex-shrink-0">
                {getInitials(client.name)}
              </div>
            );

            const statusPill = (
              <span className={`text-sm font-medium px-3 py-1.5 rounded-full flex-shrink-0 ${statusStyle}`}>
                {statusLabel}
              </span>
            );

            const waBtn = (
              <button
                onClick={() => window.open(waUrl, "_blank")}
                className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#22C55E] text-white text-sm px-4 py-2.5 rounded-full font-semibold transition"
              >
                <WhatsAppIcon /> WhatsApp
              </button>
            );

            const copyBtn = (
              <button
                onClick={() => copyLink(client)}
                className="text-sm px-4 py-2.5 rounded-full border border-[#DADCE0] text-[#0B0B0C] hover:bg-[#F4F5F7] transition font-medium"
              >
                {copiedId === client.id ? "¡Copiado!" : "Copiar link"}
              </button>
            );

            const deactivateRow = (
              <div className="flex items-center gap-2">
                <button onClick={() => deactivate(client.id)} className="text-xs px-3 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition font-medium">
                  Confirmar
                </button>
                <button onClick={() => setDeactivateId(null)} className="text-xs" style={{ color: "#9098A2" }}>
                  Cancelar
                </button>
              </div>
            );

            const menuBtn = (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setMenuOpenId(menuOpenId === client.id ? null : client.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F4F5F7] transition text-[#6B727D]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                  </svg>
                </button>
                {menuOpenId === client.id && (
                  <div className="absolute right-0 top-10 bg-white border border-[#ECEDEF] rounded-xl shadow-lg p-1 min-w-[140px] z-20">
                    <button
                      onClick={() => openEdit(client)}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-[#0B0B0C] hover:bg-[#F4F5F7] rounded-lg transition"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Editar
                    </button>
                    <button
                      onClick={() => { setDeactivateId(client.id); setMenuOpenId(null); }}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            );

            const isExpanded = expandedId === client.id;
            function toggleExpand() { setExpandedId(isExpanded ? null : client.id); }

            const chevron = (
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                style={{ color: "#9098A2" }}
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            );

            return (
              <div key={client.id} className="bg-white rounded-2xl border border-[#ECEDEF]">

                {/* ── DESKTOP: single horizontal row ── */}
                <div
                  className="hidden md:flex items-center gap-4 px-5 py-4 cursor-pointer select-none"
                  onClick={toggleExpand}
                >
                  {avatar}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#0B0B0C] text-[15px] leading-tight truncate">{client.name}</p>
                    {owed.total > 0 ? (
                      <p className={`text-xs mt-0.5 font-semibold ${owed.overdue ? "text-red-600" : "text-amber-700"}`}>{owedLabel(owed)}</p>
                    ) : mainProduct ? (
                      <p className="text-xs mt-0.5" style={{ color: "#9098A2" }}>{mainProduct}</p>
                    ) : null}
                  </div>
                  <div className="text-center flex-shrink-0 w-14">
                    <p className="text-xl font-bold text-[#0B0B0C] leading-none">{refCount}</p>
                    <p className="text-[10px] mt-1" style={{ color: "#9098A2" }}>Referidos</p>
                  </div>
                  <div className="text-center flex-shrink-0 w-16">
                    <p className="text-xl font-bold text-[#0B0B0C] leading-none">{conv}</p>
                    <p className="text-[10px] mt-1" style={{ color: "#9098A2" }}>Convertidos</p>
                  </div>
                  {statusPill}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {waBtn}
                    {deactivateId === client.id ? deactivateRow : (
                      <>
                        {copyBtn}
                        {menuBtn}
                      </>
                    )}
                  </div>
                  {chevron}
                </div>

                {/* ── MOBILE: stacked layout ── */}
                <div className="md:hidden px-5 pt-4 pb-5">
                  {/* Row 1: avatar + name/product — clickable */}
                  <div className="flex items-center gap-3 mb-4 cursor-pointer select-none" onClick={toggleExpand}>
                    {avatar}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#0B0B0C] text-base leading-snug">{client.name}</p>
                      {owed.total > 0 ? (
                        <p className={`text-sm font-semibold ${owed.overdue ? "text-red-600" : "text-amber-700"}`}>{owedLabel(owed)}</p>
                      ) : mainProduct ? (
                        <p className="text-sm" style={{ color: "#9098A2" }}>{mainProduct}</p>
                      ) : null}
                    </div>
                    {chevron}
                  </div>
                  {/* Row 2: stats + status pill — clickable */}
                  <div className="flex items-center gap-5 mb-4 cursor-pointer select-none" onClick={toggleExpand}>
                    <div>
                      <p className="text-2xl font-bold text-[#0B0B0C] leading-none">{refCount}</p>
                      <p className="text-[11px] mt-1" style={{ color: "#9098A2" }}>Referidos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#0B0B0C] leading-none">{conv}</p>
                      <p className="text-[11px] mt-1" style={{ color: "#9098A2" }}>Convertidos</p>
                    </div>
                    <div className="ml-auto">
                      {statusPill}
                    </div>
                  </div>

                  {/* Row 3: action buttons */}
                  {deactivateId === client.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => deactivate(client.id)} className="flex-1 text-sm py-2.5 rounded-full bg-red-50 text-red-600 font-medium">
                        Confirmar desactivar
                      </button>
                      <button onClick={() => setDeactivateId(null)} className="px-4 text-sm py-2.5 rounded-full border border-[#DADCE0]" style={{ color: "#9098A2" }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.open(waUrl, "_blank")}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#22C55E] text-white text-sm py-2.5 rounded-full font-semibold transition"
                      >
                        <WhatsAppIcon /> WhatsApp
                      </button>
                      <button
                        onClick={() => copyLink(client)}
                        className="flex-1 text-sm py-2.5 rounded-full border border-[#DADCE0] text-[#0B0B0C] hover:bg-[#F4F5F7] transition font-medium"
                      >
                        {copiedId === client.id ? "¡Copiado!" : "Copiar link"}
                      </button>
                      {menuBtn}
                    </div>
                  )}
                </div>

                {/* ── EXPANDED DETAIL ── */}
                {isExpanded && (
                  <div className="border-t border-[#ECEDEF]">
                    {/* Contact info */}
                    {(client.phone || client.email) && (
                      <div className="px-5 py-3 flex flex-wrap gap-x-6 gap-y-1 border-b border-[#ECEDEF]">
                        {client.phone && (
                          <span className="text-sm text-[#3F4651] flex items-center gap-1.5">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.01 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            {client.phone}
                          </span>
                        )}
                        {client.email && (
                          <span className="text-sm text-[#3F4651] flex items-center gap-1.5">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.5"/><path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            {client.email}
                          </span>
                        )}
                        {client.policyNumber && (
                          <span className="text-sm text-[#3F4651] flex items-center gap-1.5">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            {client.policyNumber}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Financial grid */}
                    <div className="px-5 py-4 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-[#8A8F98] mb-1.5">Se le debe</p>
                        <p className={`text-[22px] font-bold leading-none ${owed.overdue ? "text-red-600" : totalOwed > 0 ? "text-amber-600" : "text-[#0B0B0C]"}`}>
                          {formatCurrency(totalOwed)}
                        </p>
                        {owed.total > 0 && owed.deadline !== null && (
                          <p className={`text-[11px] mt-1.5 font-medium ${owed.overdue ? "text-red-600" : "text-amber-700"}`}>
                            {owed.overdue
                              ? `Vencido · pago obligatorio (venció el ${formatDate(new Date(owed.deadline))})`
                              : `Paga antes del ${formatDate(new Date(owed.deadline))}`}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-[#8A8F98] mb-1.5">Pagado total</p>
                        <p className={`text-[22px] font-bold leading-none ${totalPaid > 0 ? "text-green-600" : "text-[#0B0B0C]"}`}>
                          {formatCurrency(totalPaid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A8F98] mb-1.5">Puntos burbuja</p>
                        <p className={`text-[22px] font-bold leading-none ${client.bubblePoints > 0 ? "text-[#2563EB]" : "text-[#0B0B0C]"}`}>
                          {client.bubblePoints} <span className="text-sm font-medium text-[#8A8F98]">pts</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Overlay to close menu on outside click */}
      {menuOpenId && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
      )}

      {/* Edit modal */}
      {editingClient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(11,11,12,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setEditingClient(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#ECEDEF]">
              <p className="font-bold text-[#0B0B0C] text-[17px]">Editar cliente</p>
              <button
                onClick={() => setEditingClient(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F4F5F7] transition text-[#9098A2]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="px-5 py-5 space-y-3">
              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-wide text-[#9098A2]">Nombre *</label>
                <input
                  type="text" required value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DADCE0] text-sm focus:outline-none focus:ring-2 focus:ring-[#0B0B0C] transition"
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-wide text-[#9098A2]">Teléfono</label>
                <input
                  type="tel" value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DADCE0] text-sm focus:outline-none focus:ring-2 focus:ring-[#0B0B0C] transition"
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-wide text-[#9098A2]">Correo</label>
                <input
                  type="email" value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DADCE0] text-sm focus:outline-none focus:ring-2 focus:ring-[#0B0B0C] transition"
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-wide text-[#9098A2]">No. de póliza</label>
                <input
                  type="text" value={editForm.policyNumber}
                  onChange={(e) => setEditForm({ ...editForm, policyNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DADCE0] text-sm focus:outline-none focus:ring-2 focus:ring-[#0B0B0C] transition"
                />
              </div>
              {editError && (
                <p className="text-red-500 text-xs">{editError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit" disabled={editSubmitting}
                  className="flex-1 bg-[#0B0B0C] text-white text-sm py-2.5 rounded-full font-medium hover:bg-[#26262a] disabled:opacity-50 transition"
                >
                  {editSubmitting ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  type="button" onClick={() => setEditingClient(null)} disabled={editSubmitting}
                  className="px-5 text-sm py-2.5 rounded-full border border-[#DADCE0] hover:bg-[#F4F5F7] transition text-[#6B727D]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

