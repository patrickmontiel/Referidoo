"use client";

import { useEffect, useState } from "react";
import { formatDate, formatCurrency } from "@/lib/utils";

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
  referrals: { rewardAmount: number; rewardStatus: string; status: string }[];
};

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", policyNumber: "" });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function load() {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => { setClients(Array.isArray(d) ? d : []); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", email: "", phone: "", policyNumber: "" });
      setShowForm(false);
      load();
    }
    setSubmitting(false);
  }

  async function deactivate(id: string) {
    if (!confirm("¿Desactivar este cliente?")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="text-sm text-gray-400 mt-0.5">{clients.filter((c) => c.active).length} activos</p>
        </div>
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
      <div className="relative mb-4">
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
        <div className="space-y-3">
          {filtered.map((client) => {
            const earned = client.referrals.filter(r => r.rewardStatus === "paid").reduce((s, r) => s + r.rewardAmount, 0);
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
                  <button
                    onClick={() => deactivate(client.id)}
                    className="text-gray-300 hover:text-red-400 transition p-1"
                    title="Desactivar"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
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
                    <p className="text-base font-semibold">{formatCurrency(earned)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Pagado</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-50 space-y-2">
                  {/* WhatsApp — primary action */}
                  <button
                    onClick={() => {
                      const firstName = client.name.split(" ")[0];
                      const msg = `¡Hola ${firstName}! 👋 Habla Eduardo Neri.\n\nQuiero invitarte a Referidoo, mi programa de referidos. Si compartes tu link personal con amigos o familiares y alguno contrata un plan de vida, PPR o cuenta patrimonial, tú ganas en efectivo — hasta $3,500 por referido.\n\nEntra aquí, tarda menos de un minuto:\n${portalLink}`;
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
