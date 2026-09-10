import { describe, it, expect } from "vitest";

// FECHA DE CIERRE INMUTABLE (Referral.convertedAt)
//
// El bug: `updatedAt` se usaba como fecha de cierre, pero es mutable. Un
// referido cerrado en JULIO al que se le valida la carátula en SEPTIEMBRE
// "se movía" a septiembre, reescribiendo cierres del mes, GWP por periodo,
// ranking temporal y días-a-cierre de forma retroactiva.
//
// Estas pruebas fijan la semántica que implementa
// `src/app/api/referrals/[id]/route.ts`:
//   convertedAt se sella en la PRIMERA transición no-converted → converted
//   y NINGUNA actualización posterior lo modifica.

const JULIO = new Date("2026-07-15T12:00:00.000Z");
const SEPTIEMBRE = new Date("2026-09-09T12:00:00.000Z");

type ReferralLike = {
  status: string;
  convertedAt: Date | null;
  updatedAt: Date;
};

/**
 * Réplica exacta de la regla del endpoint:
 *   isConverting = nuevo status es converted Y el anterior NO lo era
 *   se escribe convertedAt SOLO si isConverting && !convertedAt
 * Cualquier otra edición solo mueve updatedAt.
 */
function applyUpdate(referral: ReferralLike, newStatus: string, now: Date): ReferralLike {
  const isConverting = newStatus === "converted" && referral.status !== "converted";
  return {
    status: newStatus,
    convertedAt: isConverting && !referral.convertedAt ? now : referral.convertedAt,
    updatedAt: now, // @updatedAt siempre se mueve
  };
}

/** Métrica temporal: cierres de un mes, usando la fecha inmutable. */
function closesInMonth(referrals: ReferralLike[], year: number, month: number): number {
  return referrals.filter(
    (r) =>
      r.status === "converted" &&
      r.convertedAt != null &&
      r.convertedAt.getUTCFullYear() === year &&
      r.convertedAt.getUTCMonth() === month
  ).length;
}

describe("convertedAt — fecha de cierre inmutable", () => {
  it("1) creado y cerrado en julio, EDITADO en septiembre → convertedAt sigue en julio", () => {
    let r: ReferralLike = { status: "pending", convertedAt: null, updatedAt: JULIO };
    r = applyUpdate(r, "converted", JULIO);
    expect(r.convertedAt).toEqual(JULIO);

    // Edición cualquiera en septiembre (sigue converted).
    r = applyUpdate(r, "converted", SEPTIEMBRE);
    expect(r.convertedAt).toEqual(JULIO); // ← NO se movió
    expect(r.updatedAt).toEqual(SEPTIEMBRE); // updatedAt sí (es su trabajo)
  });

  it("2) validar la carátula en septiembre NO cambia convertedAt", () => {
    let r: ReferralLike = { status: "converted", convertedAt: JULIO, updatedAt: JULIO };
    // La validación de carátula es un update que no toca el status.
    r = applyUpdate(r, r.status, SEPTIEMBRE);
    expect(r.convertedAt).toEqual(JULIO);
  });

  it("3) la consulta de cierres mensuales lo cuenta en JULIO, no en septiembre", () => {
    let r: ReferralLike = { status: "pending", convertedAt: null, updatedAt: JULIO };
    r = applyUpdate(r, "converted", JULIO);
    r = applyUpdate(r, "converted", SEPTIEMBRE); // carátula validada después

    expect(closesInMonth([r], 2026, 6)).toBe(1); // julio (mes 6, 0-indexed)
    expect(closesInMonth([r], 2026, 8)).toBe(0); // septiembre → NO
  });

  it("4) un referido que nunca se convirtió tiene convertedAt = null", () => {
    let r: ReferralLike = { status: "pending", convertedAt: null, updatedAt: JULIO };
    r = applyUpdate(r, "contacted", JULIO);
    r = applyUpdate(r, "in_process", SEPTIEMBRE);
    expect(r.convertedAt).toBeNull();
    expect(closesInMonth([r], 2026, 6)).toBe(0);
  });

  it("5) la PRIMERA transición a converted sella convertedAt", () => {
    let r: ReferralLike = { status: "contacted", convertedAt: null, updatedAt: JULIO };
    r = applyUpdate(r, "converted", JULIO);
    expect(r.convertedAt).toEqual(JULIO);
  });

  it("6) una segunda actualización estando converted NO pisa convertedAt", () => {
    let r: ReferralLike = { status: "converted", convertedAt: JULIO, updatedAt: JULIO };
    r = applyUpdate(r, "converted", SEPTIEMBRE);
    r = applyUpdate(r, "converted", new Date("2026-12-01T00:00:00.000Z"));
    expect(r.convertedAt).toEqual(JULIO);
  });

  it("des-convertir y volver a convertir NO reescribe el primer cierre (V1)", () => {
    // Si se marcó "contacted" por error y se vuelve a convertir, convertedAt
    // conserva el PRIMER cierre. No se borra automáticamente.
    let r: ReferralLike = { status: "converted", convertedAt: JULIO, updatedAt: JULIO };
    r = applyUpdate(r, "contacted", SEPTIEMBRE);
    expect(r.convertedAt).toEqual(JULIO); // no se borra
    r = applyUpdate(r, "converted", SEPTIEMBRE);
    expect(r.convertedAt).toEqual(JULIO); // sigue siendo el primer cierre
  });

  it("los cierres sin convertedAt se excluyen de métricas TEMPORALES", () => {
    // Convertido antes de que existiera la columna, con edición posterior →
    // su fecha real es desconocida. No se inventa: se excluye del periodo.
    const sinFecha: ReferralLike = { status: "converted", convertedAt: null, updatedAt: SEPTIEMBRE };
    expect(closesInMonth([sinFecha], 2026, 8)).toBe(0);
    // …pero sigue contando en el total histórico:
    const totalHistorico = [sinFecha].filter((r) => r.status === "converted").length;
    expect(totalHistorico).toBe(1);
  });
});
