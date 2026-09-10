// CARTERA PERSISTENTE — identidad y deduplicación de Client.
//
// Problema que resuelve: `Client` no tenía NINGÚN dedupe (sin unique en email
// ni teléfono). Reimportar el mismo CSV creaba filas duplicadas, así que la
// cartera no era un activo persistente — se re-creaba en cada import.
//
// Reglas (ver 11-PORTFOLIO-PERSISTENCE-IMPLEMENTATION.md):
//   CASE A · mismo teléfono normalizado, MISMO asesor  → MATCH de alta confianza
//   CASE B · teléfono distinto pero email igual        → POSIBLE DUPLICADO (no auto-merge)
//   CASE C · sin match                                  → NUEVO
//   CASE D · sin teléfono y sin email                   → NO CONTACTABLE (se permite, se avisa)
//
// El dedupe es SIEMPRE dentro del mismo advisorId: dos asesores pueden tener
// legítimamente al mismo humano en sus carteras y NUNCA se fusionan.

import { normalizePhone } from "./utils";

/** Teléfono comparable: solo dígitos, últimos 10 (MX). null si no hay nada útil. */
export function normalizeClientPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 0) return null;
  // normalizePhone ya recorta a los últimos 10 dígitos (ignora +52 / lada / espacios).
  const normalized = normalizePhone(digits);
  return normalized.length > 0 ? normalized : null;
}

/** Email comparable: trim + lowercase. null si vacío. */
export function normalizeClientEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const clean = String(email).trim().toLowerCase();
  return clean.length > 0 ? clean : null;
}

export type ImportRowInput = {
  name?: string;
  phone?: string;
  email?: string;
  policyNumber?: string;
};

/** Cliente existente, en la forma mínima necesaria para hacer match. */
export type ExistingClientLite = {
  id: string;
  name: string;
  normalizedPhone: string | null;
  normalizedEmail: string | null;
};

export type RowStatus =
  | "NUEVO"
  | "YA_EXISTE"
  | "POSIBLE_DUPLICADO"
  | "FALTA_DATO"
  | "NO_CONTACTABLE";

export type ClassifiedRow = {
  row: ImportRowInput;
  name: string;
  normalizedPhone: string | null;
  normalizedEmail: string | null;
  status: RowStatus;
  /** Client existente con el que hizo match (YA_EXISTE o POSIBLE_DUPLICADO). */
  matchedClientId?: string;
  matchedClientName?: string;
  reason?: string;
};

/**
 * Clasifica las filas de un import contra la cartera existente del asesor.
 * NO escribe nada — es la base del preview ("86 encontrados · 72 nuevos ·
 * 9 ya existen · 3 posibles duplicados · 2 necesitan datos").
 *
 * Deduplica también DENTRO del propio archivo: si el CSV trae dos veces al
 * mismo teléfono, la segunda aparición se marca como YA_EXISTE del primero.
 */
export function classifyImportRows(
  rows: ImportRowInput[],
  existing: ExistingClientLite[]
): ClassifiedRow[] {
  const byPhone = new Map<string, ExistingClientLite>();
  const byEmail = new Map<string, ExistingClientLite>();
  for (const c of existing) {
    if (c.normalizedPhone) byPhone.set(c.normalizedPhone, c);
    if (c.normalizedEmail) byEmail.set(c.normalizedEmail, c);
  }

  // Vistos dentro del archivo (para no duplicar en el mismo lote).
  const seenPhone = new Set<string>();
  const seenEmail = new Set<string>();

  return rows.map((row) => {
    const name = (row.name ?? "").trim();
    const normalizedPhone = normalizeClientPhone(row.phone);
    const normalizedEmail = normalizeClientEmail(row.email);
    const base = { row, name, normalizedPhone, normalizedEmail };

    if (!name) {
      return { ...base, status: "FALTA_DATO" as const, reason: "Falta el nombre" };
    }

    // CASE A — match de alta confianza por teléfono (mismo asesor).
    if (normalizedPhone) {
      const hit = byPhone.get(normalizedPhone);
      if (hit) {
        return {
          ...base,
          status: "YA_EXISTE" as const,
          matchedClientId: hit.id,
          matchedClientName: hit.name,
          reason: "Mismo teléfono: se actualizan sus datos y conserva su link",
        };
      }
      if (seenPhone.has(normalizedPhone)) {
        return { ...base, status: "YA_EXISTE" as const, reason: "Repetido dentro del mismo archivo" };
      }
    }

    // CASE B — email coincide pero el teléfono no: NO auto-merge.
    if (normalizedEmail) {
      const hit = byEmail.get(normalizedEmail);
      if (hit && (!normalizedPhone || hit.normalizedPhone !== normalizedPhone)) {
        return {
          ...base,
          status: "POSIBLE_DUPLICADO" as const,
          matchedClientId: hit.id,
          matchedClientName: hit.name,
          reason: "Mismo correo pero teléfono distinto — tú decides si es la misma persona",
        };
      }
      if (seenEmail.has(normalizedEmail) && !normalizedPhone) {
        return { ...base, status: "POSIBLE_DUPLICADO" as const, reason: "Correo repetido dentro del archivo" };
      }
    }

    // CASE D — existe pero no se le puede contactar por ningún canal.
    if (!normalizedPhone && !normalizedEmail) {
      if (normalizedPhone) seenPhone.add(normalizedPhone);
      return {
        ...base,
        status: "NO_CONTACTABLE" as const,
        reason: "Sin teléfono ni correo: se puede guardar, pero no se le puede activar",
      };
    }

    // CASE C — nuevo.
    if (normalizedPhone) seenPhone.add(normalizedPhone);
    if (normalizedEmail) seenEmail.add(normalizedEmail);
    return { ...base, status: "NUEVO" as const };
  });
}

/** Resumen para el preview del import. */
export function summarizeClassification(rows: ClassifiedRow[]) {
  const count = (s: RowStatus) => rows.filter((r) => r.status === s).length;
  return {
    total: rows.length,
    nuevos: count("NUEVO"),
    yaExisten: count("YA_EXISTE"),
    posiblesDuplicados: count("POSIBLE_DUPLICADO"),
    faltaDato: count("FALTA_DATO"),
    noContactables: count("NO_CONTACTABLE"),
  };
}
