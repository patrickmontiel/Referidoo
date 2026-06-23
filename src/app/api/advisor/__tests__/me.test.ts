import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { advisor: { findUnique: vi.fn() } },
}));
vi.mock("@/lib/auth", () => ({ getAdvisorSession: vi.fn() }));

import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { GET } from "../me/route";

const mockSession = getAdvisorSession as unknown as ReturnType<typeof vi.fn>;
const mockFindUnique = db.advisor.findUnique as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockSession.mockReset();
  mockFindUnique.mockReset();
});

describe("GET /api/advisor/me", () => {
  it("returns 401 without a session", async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when the advisor record is missing", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockFindUnique.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  // Regresión: el select original olvidó incluir `plan`, lo que rompía
  // silenciosamente el banner de upgrade en /admin (advisor.plan llegaba
  // undefined al cliente) — solo se detectó probando en navegador real.
  it("includes plan, emailVerified, and paidUntil in the selected fields (regression)", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockFindUnique.mockResolvedValue({ id: "adv1", name: "Ana", plan: "paid", emailVerified: true, paidUntil: "2026-07-23" });

    const res = await GET();
    const data = await res.json();

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.objectContaining({ plan: true, emailVerified: true, paidUntil: true }) })
    );
    expect(data.plan).toBe("paid");
    expect(data.emailVerified).toBe(true);
    expect(data.paidUntil).toBe("2026-07-23");
  });
});
