import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// PRIVACY BOUNDARY (kill criterion de la Fase 5):
//   El Owner necesita el PERFORMANCE de la cartera, NO la IDENTIDAD de los
//   clientes de sus asesores. Esconderlo en React no basta: la PII no debe
//   SALIR del API ni de las páginas SSR del owner.
//
// Esta prueba escanea el código fuente del plano de control del owner y falla
// si alguien vuelve a seleccionar/proyectar PII de cliente o lead.
//
// Nota: el NOMBRE y EMAIL del ASESOR sí están permitidos — los asesores son los
// clientes de Referidoo. Lo prohibido es la PII de los clientes DE ELLOS.

const ROOT = join(process.cwd(), "src");

const OWNER_SURFACE = [
  join(ROOT, "app", "api", "owner"),
  join(ROOT, "app", "owner"),
  join(ROOT, "lib", "owner-problems.ts"),
  join(ROOT, "lib", "owner-narrative-ai.ts"),
];

// Campos de PII de CLIENTE/LEAD que jamás deben aparecer en el owner.
const FORBIDDEN_FIELDS = [
  "leadName",
  "leadPhone",
  "leadEmail",
  "leadNotes",
  "policyNumber",
  "clabe",
  "clabeBank",
  "clabeHolder",
  "accessToken",
  "referralCode",
];

// Proyecciones que traen el NOMBRE del cliente por relación.
// El lookahead `(?!advisor)` permite `client: { select: { advisor: { select:
// { name } } } }` — ese `name` es del ASESOR (permitido), no del cliente.
const FORBIDDEN_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /referrer:\s*\{\s*select:\s*\{(?:(?!advisor)[^{}])*\bname\s*:/, label: "referrer.select.name (nombre del cliente referidor)" },
  { pattern: /client:\s*\{\s*select:\s*\{(?:(?!advisor)[^{}])*\bname\s*:/, label: "client.select.name (nombre del cliente)" },
];

// Endpoints de OPERACIÓN (no analytics): mutan estado o resuelven una tarea
// puntual del owner. No agregan métricas, así que no requieren el alcance de
// analytics. Se listan explícitamente para que la excepción sea revisable.
const OPERATIONS_ENDPOINTS = ["backfill-trials", "caratulas", "resend-verification"];

function collectFiles(target: string): string[] {
  let st;
  try {
    st = statSync(target);
  } catch {
    return [];
  }
  if (st.isFile()) return target.endsWith(".ts") || target.endsWith(".tsx") ? [target] : [];
  return readdirSync(target).flatMap((entry) => collectFiles(join(target, entry)));
}

const files = OWNER_SURFACE.flatMap(collectFiles).filter((f) => !f.includes("__tests__"));

describe("Owner analytics — sin PII de clientes/leads", () => {
  it("encuentra archivos del plano de control del owner para escanear", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(FORBIDDEN_FIELDS)("ningún archivo del owner referencia el campo `%s`", (field) => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      // Ignora comentarios: nos importan las referencias reales al campo.
      const code = src
        .split("\n")
        .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
        .join("\n");
      if (new RegExp(`\\b${field}\\b`).test(code)) {
        offenders.push(file.replace(process.cwd(), ""));
      }
    }
    expect(offenders, `PII de cliente/lead filtrada en: ${offenders.join(", ")}`).toEqual([]);
  });

  it.each(FORBIDDEN_PATTERNS)("ningún archivo del owner proyecta $label", ({ pattern }) => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (pattern.test(src)) offenders.push(file.replace(process.cwd(), ""));
    }
    expect(offenders, `nombre de cliente proyectado en: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("Owner analytics — sin constantes de benchmark sin fuente", () => {
  it("no queda ninguna referencia a 'Focus Digital' ni a la constante de industria", () => {
    const offenders: string[] = [];
    for (const file of files) {
      // Solo código: un comentario que documenta POR QUÉ se eliminó es válido.
      const code = readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
        .join("\n");
      if (/Focus Digital|INDUSTRY_CLOSE_RATE/.test(code)) offenders.push(file.replace(process.cwd(), ""));
    }
    expect(offenders, `benchmark sin fuente en: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("Owner analytics — todas las queries usan el alcance real", () => {
  it("ningún archivo del owner filtra asesores solo por deletedAt sin el filtro compartido", () => {
    // Si un archivo consulta advisor/referral y NO importa analytics-scope,
    // es candidato a contar cuentas internas o referidos borrados.
    const offenders: string[] = [];
    for (const file of files) {
      if (OPERATIONS_ENDPOINTS.some((op) => file.includes(op))) continue; // operación, no analytics
      const src = readFileSync(file, "utf8");
      const queriesData = /db\.(advisor|referral|client|planEvent|productEvent|referralCampaign)\./.test(src);
      const usesScope = /analytics-scope/.test(src);
      if (queriesData && !usesScope) offenders.push(file.replace(process.cwd(), ""));
    }
    expect(offenders, `queries de owner sin alcance real: ${offenders.join(", ")}`).toEqual([]);
  });
});
