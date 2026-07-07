import { redirect } from "next/navigation";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";

// Biblioteca de documentos del negocio, organizada en carpetas por tipo.
// Los URLs apuntan a los artifacts (privados de la cuenta de Claude del
// dueño). Al crear un documento nuevo, se agrega aquí — este archivo es la
// fuente de verdad del inventario.
type Doc = {
  titulo: string;
  descripcion: string;
  url?: string;
  actualizado: string;
};

const CARPETAS: { nombre: string; nota: string; docs: Doc[] }[] = [
  {
    nombre: "Estrategia",
    nota: "Va primero, siempre: el cerebro del negocio. Todo lo demás deriva de aquí y se relee cada mes.",
    docs: [
      {
        titulo: "Whitepaper Maestro",
        descripcion: "Tesis, potencial oculto, mercado (CNSF/AMIS), fases GTM, capítulos 1/7/8/11/12 redactados, los 9 playbooks y checklist de 30 días.",
        url: "https://claude.ai/code/artifact/af1ed7f5-4cf5-42f1-b184-0db1276bc516",
        actualizado: "jul 2026 · v0.4",
      },
    ],
  },
  {
    nombre: "Guiones",
    nota: "Lo que sigue esta semana: la entrevista es la acción #1 de la fase concierge.",
    docs: [
      {
        titulo: "Entrevista con Eduardo (45 min)",
        descripcion: "Arquetipo del asesor (cap. 3), test de uso en vivo para cazar fallas funcionales, testimonio y loop /unete. Reutilizable con cada asesor de la fase 0→10.",
        url: "https://claude.ai/code/artifact/17dbf0d9-20fc-4e8a-9404-e31c5c2e41d3",
        actualizado: "jul 2026 · v1",
      },
    ],
  },
  {
    nombre: "Presentaciones",
    nota: "Para conseguir asesores (y después, capital). El de asesores se usa en cada demo; el de inversionistas espera su momento.",
    docs: [
      {
        titulo: "Deck para nuevos asesores",
        descripcion: "9 slides de venta: problema, data de canales, cómo funciona, la matemática de su cartera, premios, precio y CTA de alta.",
        url: "https://claude.ai/code/artifact/e9bbe851-ff82-4007-9c59-d21b14d70af2",
        actualizado: "jul 2026 · v1",
      },
      {
        titulo: "Deck para inversionistas",
        descripcion: "12 slides pre-seed: mercado con padrón CNSF verificado, modelo de dos motores, tracción honesta, loops, moat, roadmap y ask.",
        url: "https://claude.ai/code/artifact/bdaeb3a2-e543-489e-b7ad-7601bb124393",
        actualizado: "jul 2026 · v1.1 (ask por definir)",
      },
    ],
  },
  {
    nombre: "Playbooks",
    nota: "La operación diaria, en orden del embudo: adquirir → onboardear → contenido en paralelo. Si un playbook contradice al whitepaper, uno de los dos se corrige ese día.",
    docs: [
      {
        titulo: "Manual de Playbooks (1·3·4·6·7·9)",
        descripcion: "El embudo completo: adquisición, activación de clientes, freemium→Pro, promotorías, retención y economía de premios — objetivo, disparador, pasos y métrica de cada uno.",
        url: "https://claude.ai/code/artifact/a9b6496f-1c30-4d91-bac5-e49d5b021e93",
        actualizado: "jul 2026 · v1",
      },
      {
        titulo: "Playbook 2 — Onboarding 7 días",
        descripcion: "Se usa con CADA alta nueva: del alta al primer referido en 7 días, con secuencia día por día, 3 plantillas de WhatsApp y fallas comunes.",
        url: "https://claude.ai/code/artifact/5cd0c290-163a-4240-8af8-c7da56b016ca",
        actualizado: "jul 2026 · v1",
      },
      {
        titulo: "Playbook 8 — Contenido builder in progress",
        descripcion: "Corre en paralelo cada semana: canales (TikTok+Reels / LinkedIn), cadencia mínima viable y los primeros 10 posts con gancho.",
        url: "https://claude.ai/code/artifact/ccf3a45e-fa92-4914-8860-c5604cfa662b",
        actualizado: "jul 2026 · v1",
      },
    ],
  },
  {
    nombre: "Datos",
    nota: "Consulta puntual — fuentes crudas, datos personales fuera de git.",
    docs: [
      {
        titulo: "Padrón CNSF + análisis",
        descripcion: "CSVs oficiales (56,539 agentes de seguros; CDMX 15,405 · Morelos 817) y script de análisis. Local: productos/referidos-seguros/prospeccion/",
        actualizado: "dic 2025 (fuente) · jul 2026 (descarga)",
      },
    ],
  },
];

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7C3 5.9 3.9 5 5 5H9L11 7H19C20.1 7 21 7.9 21 9V17C21 18.1 20.1 19 19 19H5C3.9 19 3 18.1 3 17V7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function OwnerDocumentosPage() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) redirect("/login");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-[26px] font-bold text-brand-ink">Documentos</h1>
        <p className="text-sm text-brand-gray-4 mt-1">
          La biblioteca del negocio, por carpetas y en orden de uso: de lo que va primero a lo que va después.
        </p>
      </div>

      {CARPETAS.map((carpeta, i) => (
        <section key={carpeta.nombre}>
          <div className="flex items-center gap-2 mb-1 text-brand-ink">
            <span className="text-[13px] font-extrabold text-[#2563EB] w-4">{i + 1}</span>
            <FolderIcon />
            <h2 className="font-bold text-[15px]">{carpeta.nombre}</h2>
            <span className="text-[11px] font-semibold text-brand-gray-4 bg-brand-border-1 rounded-full px-2 py-0.5">
              {carpeta.docs.length}
            </span>
          </div>
          <p className="text-xs text-brand-gray-4 mb-3">{carpeta.nota}</p>

          <div className="bg-white rounded-2xl border border-brand-border-1 overflow-hidden">
            <div className="divide-y divide-brand-border-1">
              {carpeta.docs.map((d) => (
                <div key={d.titulo} className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-brand-ink text-[15px] mb-1">{d.titulo}</p>
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
        </section>
      ))}

      <p className="text-xs text-brand-gray-5">
        Los documentos viven como artifacts privados de tu cuenta de Claude — para compartir uno,
        ábrelo y usa su opción de compartir. Este inventario se actualiza en
        src/app/owner/documentos/page.tsx.
      </p>
    </div>
  );
}
