import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    referral: { deleteMany: vi.fn() },
    client: { deleteMany: vi.fn() },
    advisor: { update: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ getAdvisorSession: vi.fn() }));

import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { POST } from "../reset/route";

const mockSession = getAdvisorSession as unknown as ReturnType<typeof vi.fn>;
const mockReferralDeleteMany = db.referral.deleteMany as unknown as ReturnType<typeof vi.fn>;
const mockClientDeleteMany = db.client.deleteMany as unknown as ReturnType<typeof vi.fn>;
const mockAdvisorUpdate = db.advisor.update as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockSession.mockReset();
  mockReferralDeleteMany.mockReset().mockResolvedValue({ count: 0 });
  mockClientDeleteMany.mockReset().mockResolvedValue({ count: 0 });
  mockAdvisorUpdate.mockReset().mockResolvedValue({});
});

describe("POST /api/demo/reset", () => {
  it("returns 401 without a session", async () => {
    mockSession.mockResolvedValue(null);

    const res = await POST();

    expect(res.status).toBe(401);
    expect(mockReferralDeleteMany).not.toHaveBeenCalled();
  });

  // Regresión: el reset borraba TODOS los referidos y clientes de TODOS los
  // asesores (sin filtro por advisorId), no solo los del asesor que apretó
  // el botón — un solo clic en "Reiniciar demo" de cualquier cuenta borraba
  // los datos reales de todos los demás asesores.
  it("only deletes referrals and clients belonging to the requesting advisor", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@x.com" });

    await POST();

    expect(mockReferralDeleteMany).toHaveBeenCalledWith({ where: { advisorId: "adv1" } });
    expect(mockClientDeleteMany).toHaveBeenCalledWith({ where: { advisorId: "adv1" } });
  });

  it("resets the requesting advisor's onboarding flag", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@x.com" });

    await POST();

    expect(mockAdvisorUpdate).toHaveBeenCalledWith({
      where: { id: "adv1" },
      data: { onboardedAt: null },
    });
  });
});
