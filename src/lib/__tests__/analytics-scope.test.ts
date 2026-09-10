import { describe, it, expect } from "vitest";
import {
  REAL_ADVISOR_WHERE,
  REAL_ADVISOR_RELATION_WHERE,
  REAL_REFERRAL_WHERE,
  REAL_CLIENT_WHERE,
  REAL_PAID_SUBSCRIPTION_WHERE,
  safeRate,
} from "@/lib/analytics-scope";

// DATA TRUTH: estos filtros son la ÚNICA puerta por la que entran datos a las
// métricas de Owner. Si alguien los relaja, estas pruebas fallan.

describe("alcance de analytics (aislamiento de cuentas internas)", () => {
  it("un asesor real exige NO borrado y NO excluido de analytics", () => {
    expect(REAL_ADVISOR_WHERE).toEqual({ deletedAt: null, analyticsExcluded: false });
  });

  it("nunca filtra por email/nombre hardcodeado (es una propiedad explícita)", () => {
    const serialized = JSON.stringify({
      REAL_ADVISOR_WHERE,
      REAL_REFERRAL_WHERE,
      REAL_CLIENT_WHERE,
      REAL_PAID_SUBSCRIPTION_WHERE,
    });
    expect(serialized).not.toMatch(/@/); // ningún email
    expect(serialized.toLowerCase()).not.toContain("qa");
    expect(serialized.toLowerCase()).not.toContain("test");
    expect(serialized).toContain("analyticsExcluded");
  });

  it("los referidos cuentan solo si NO están borrados y su asesor es real", () => {
    // Referral.deletedAt no se filtraba en NINGUNA query de owner (bug histórico).
    expect(REAL_REFERRAL_WHERE.deletedAt).toBeNull();
    expect(REAL_REFERRAL_WHERE.advisor).toEqual(REAL_ADVISOR_WHERE);
  });

  it("los clientes cuentan solo si están activos y su asesor es real", () => {
    expect(REAL_CLIENT_WHERE.active).toBe(true);
    expect(REAL_CLIENT_WHERE.advisor).toEqual(REAL_ADVISOR_WHERE);
  });

  it("la relación advisor siempre apunta al filtro real", () => {
    expect(REAL_ADVISOR_RELATION_WHERE.advisor).toEqual(REAL_ADVISOR_WHERE);
  });

  it("MRR real exige suscripción de Mercado Pago viva (paid sin mpPreapprovalId = trial/comp)", () => {
    expect(REAL_PAID_SUBSCRIPTION_WHERE.plan).toBe("paid");
    expect(REAL_PAID_SUBSCRIPTION_WHERE.mpPreapprovalId).toEqual({ not: null });
    expect(REAL_PAID_SUBSCRIPTION_WHERE.analyticsExcluded).toBe(false);
  });
});

describe("safeRate — cero es mejor que inventar", () => {
  it("devuelve null (no 0%, no 100%) cuando no hay denominador", () => {
    expect(safeRate(0, 0)).toBeNull();
    expect(safeRate(5, 0)).toBeNull();
    expect(safeRate(3, -1)).toBeNull();
  });

  it("calcula la tasa cuando sí hay denominador", () => {
    expect(safeRate(1, 4)).toBe(0.25);
    expect(safeRate(0, 10)).toBe(0);
  });
});
