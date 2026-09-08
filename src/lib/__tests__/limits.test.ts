import { describe, it, expect, vi } from "vitest";

// plan.ts importa el cliente Prisma; lo mockeamos para no abrir una conexión.
vi.mock("@/lib/db", () => ({ db: {} }));

import { FREEMIUM_LEAD_LIMIT } from "@/lib/limits";
import { FREEMIUM_LEAD_LIMIT as PLAN_LIMIT } from "@/lib/plan";

describe("FREEMIUM_LEAD_LIMIT — fuente única de verdad", () => {
  it("el tope real es 5", () => {
    expect(FREEMIUM_LEAD_LIMIT).toBe(5);
  });

  it("plan.ts re-exporta exactamente el mismo valor (sin duplicar)", () => {
    expect(PLAN_LIMIT).toBe(FREEMIUM_LEAD_LIMIT);
  });
});
