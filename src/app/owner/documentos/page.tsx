import { redirect } from "next/navigation";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";

// Biblioteca de documentos del negocio. Los URLs apuntan a los artifacts
// (privados de la cuenta de Claude del dueño). Al crear un documento nuevo,
// se agrega aquí — este archivo es la fuente de verdad del inventario.
const DOCS: {
  titulo: string;
  tipo: "Whitepaper" | "Playbook" | "Presentación" | "Guión" | "Datos";
  descripcion: string;
  url?: string;
  actualizado: string;
}[] = [
  {
    titulo: "Whitepaper Maestro",
    tipo: "Whitepaper",
    descripcion: "Tesis, potencial oculto, mercado (CNSF/AMIS), fases GTM, capítulos 1/11/12 redactados, 9 playbooks y checklist de 30 días.",
    url: "https://claude.ai/code/artifact/af1ed7f5-4cf5-42f1-b184-0db1276bc516",
    actualizado: "jul 2026 · v0.3.1",
  },
  {
    titulo: "Playbook 2 — Onboarding 7 días",
    tipo: "Playbook",
    descripcion: "Del alta al primer referido en 7 días: secuencia día por día, 3 plantillas de WhatsApp, fallas comunes y métricas.",
    url: "https://claude.ai/code/artifact/5cd0c290-163a-4240-8af8-c7da56b016ca",
    actualizado: "jul 2026 · v1",
  },
  {
    titulo: "Deck para nuevos asesores",
    tipo: "Presentación",
    descripcion: "9 slides de venta: problema, data de canales, cómo funciona, matemática de la cartera, premios, precio y CTA de alta.",
    url: "https://claude.ai/code/artifact/e9bbe851-ff82-4007-9c59-d21b14d70af2",
    actualizado: "jul 2026 · v1",
  },
  {
    titulo: "Deck para inversionistas",
    tipo: "Presentación",
    descripcion: "12 slides pre-seed: mercado con padrón CNSF verificado, modelo de dos motores, tracción honesta, loops, moat, roadmap y ask.",
    url: "https://claude.ai/code/artifact/bdaeb3a2-e543-489e-b7ad-7601bb124393",
    actualizado: "jul 2026 · v1 (ask por definir)",
  },
  {
    titulo: "Guión — Entrevista con Eduardo",
    tipo: "Guión",
    descripcion: "45 minutos: arquetipo del asesor (cap. 3), test de uso en vivo para cazar fallas funcionales, testimonio y loop /unete.",
    url: "https://claude.ai/code/artifact/17dbf0d9-20fc-4e8a-9404-e31c5c2e41d3",
    actualizado: "jul 2026 · v1",
  },
  {
    titulo: "Playbook 8 — Contenido builder in progress",
    tipo: "Playbook",
    descripcion: "Canales (TikTok+Reels / LinkedIn), posicionamiento, cadencia mínima viable y los primeros 10 posts con gancho.",
    url: "https://claude.ai/code/artifact/ccf3a45e-fa92-4914-8860-c5604cfa662b",
    actualizado: "jul 2026 · v1",
  },
  {
    titulo: "Padrón CNSF + análisis",
    tipo: "Datos",
    descripcion: "CSVs oficiales (56,539 agentes de seguros; CDMX 15,405 · Morelos 817) y script de análisis. Local: productos/referidos-seguros/prospeccion/ (fuera de git).",
    actualizado: "dic 2025 (fuente) · jul 2026 (descarga)",
  },
];

const TIPO_STYLE: Record<string, string> = {
  Whitepaper: "bg-[#EBF2FF] text-[#2563EB]",
  Playbook: "bg-green-50 text-green-700",
  Presentación: "bg-amber-50 text-amber-700",
  Guión: "bg-[#F4F5F7] text-[#6B727D]",
  Datos: "bg-[#F4F5F7] text-[#6B727D]",
};

export default async function OwnerDocumentosPage() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) redirect("/login");

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-[26px] font-bold text-brand-ink">Documentos</h1>
        <p className="text-sm text-brand-gray-4 mt-1">
          La biblioteca del negocio — whitepaper, playbooks y presentaciones. Todo deriva del
          Whitepaper Maestro; si un playbook lo contradice, uno de los dos se corrige ese día.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-brand-border-1 overflow-hidden">
        <div className="divide-y divide-brand-border-1">
          {DOCS.map((d) => (
            <div key={d.titulo} className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap mb-1">
                  <p className="font-bold text-brand-ink text-[15px]">{d.titulo}</p>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TIPO_STYLE[d.tipo]}`}>
                    {d.tipo}
                  </span>
                </div>
                <p className="text-[13.5px] text-brand-gray-3 leading-relaxed">{d.descripcion}</p>
                <p className="text-xs text-brand-gray-5 mt-1">{d.actualizado}</p>
              </div>
              {d.url ? (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-sm font-semibold text-white bg-brand-ink px-4 py-2 rounded-full hover:bg-[#26262a] transition text-center"
                >
                  Abrir
                </a>
              ) : (
                <span className="flex-shrink-0 text-xs font-semibold text-brand-gray-4 bg-brand-surface px-3 py-2 rounded-full text-center">
                  archivo local
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-brand-gray-5">
        Los documentos viven como artifacts privados de tu cuenta de Claude — para compartir uno,
        ábrelo y usa su opción de compartir. Este inventario se actualiza en
        src/app/owner/documentos/page.tsx.
      </p>
    </div>
  );
}
