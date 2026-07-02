import { describe, it, expect } from "vitest";
import {
  computeRewardForPosition,
  isEscaleraProduct,
  calculateLessioCommission,
  type RewardTier,
} from "../rewards";

const tiers: RewardTier[] = [
  { position: 1, amount: 1500, label: "Primer referido" },
  { position: 2, amount: 1500, label: "Segundo referido" },
  { position: 3, amount: 3500, label: "Bono especial" },
];

describe("computeRewardForPosition", () => {
  it("returns the exact tier amount when one matches the next position", () => {
    const result = computeRewardForPosition(tiers, null, 0);
    expect(result).toEqual({ amount: 1500, tierPosition: 1 });
  });

  it("cycles back through tiers when afterLastTier is 'cycle' (default)", () => {
    // completedReferrals=4 -> nextPosition=5 -> cyclePos=((5-1)%3)+1=2
    const result = computeRewardForPosition(tiers, null, 4);
    expect(result).toEqual({ amount: 1500, tierPosition: 5 });
  });

  it("returns the flat amount when afterLastTier is 'flat'", () => {
    const result = computeRewardForPosition(
      tiers,
      { afterLastTier: "flat", flatAmount: 999 },
      3
    );
    expect(result).toEqual({ amount: 999, tierPosition: 4 });
  });

  it("returns the last tier's amount when afterLastTier is 'stop'", () => {
    const result = computeRewardForPosition(
      tiers,
      { afterLastTier: "stop", flatAmount: 999 },
      5
    );
    expect(result).toEqual({ amount: 3500, tierPosition: 6 });
  });

  it("falls back to a default reward when the advisor has no tiers configured", () => {
    const result = computeRewardForPosition([], null, 0);
    expect(result).toEqual({ amount: 1500, tierPosition: 1 });
  });
});

describe("isEscaleraProduct", () => {
  it("treats Vida and PPR as escalera products", () => {
    expect(isEscaleraProduct("Vida")).toBe(true);
    expect(isEscaleraProduct("PPR")).toBe(true);
  });

  it("excludes Daños/Auto, GMM, and Otro from the escalera", () => {
    expect(isEscaleraProduct("Daños/Auto")).toBe(false);
    expect(isEscaleraProduct("GMM")).toBe(false);
    expect(isEscaleraProduct("Otro")).toBe(false);
  });

  it("defaults to escalera when no product type is given", () => {
    expect(isEscaleraProduct(null)).toBe(true);
    expect(isEscaleraProduct(undefined)).toBe(true);
  });
});

describe("calculateLessioCommission", () => {
  it("computes commission using the paid rate for the given product type", () => {
    expect(calculateLessioCommission("Vida", 100000, "paid")).toBe(150);
    expect(calculateLessioCommission("Daños/Auto", 100000, "paid")).toBe(800);
    expect(calculateLessioCommission("Otro", 100000, "paid")).toBe(800);
  });

  // Regresión: freemium paga casi el doble de comisión que pagado — no solo
  // el tope de 2 clientes empuja el upgrade, también el costo por conversión
  // baja al pagar. Decidido en /office-hours 2026-06-29.
  it("computes a higher commission using the freemium rate for the same product type", () => {
    expect(calculateLessioCommission("Vida", 100000, "freemium")).toBe(250);
    expect(calculateLessioCommission("Daños/Auto", 100000, "freemium")).toBe(1500);
  });

  it("treats any plan other than 'paid' as freemium", () => {
    expect(calculateLessioCommission("Vida", 100000, null)).toBe(250);
    expect(calculateLessioCommission("Vida", 100000, undefined)).toBe(250);
  });

  it("returns null when productType or saleAmount is missing", () => {
    expect(calculateLessioCommission(null, 100000, "paid")).toBeNull();
    expect(calculateLessioCommission("Vida", null, "paid")).toBeNull();
    expect(calculateLessioCommission("Vida", 0, "paid")).toBeNull();
  });

  it("returns null for product types with no configured commission rate", () => {
    expect(calculateLessioCommission("Desconocido", 100000, "paid")).toBeNull();
  });
});
