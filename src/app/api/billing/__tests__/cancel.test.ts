import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { advisor: { findUnique: vi.fn() } },
}));
vi.mock("@/lib/auth", () => ({ getAdvisorSession: vi.fn() }));
vi.mock("@/lib/mercadopago", () => ({ cancelSubscription: vi.fn() }));

import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { cancelSubscription } from "@/lib/mercadopago";
import { POST } from "../cancel/route";

const mockSession = getAdvisorSession as unknown as ReturnType<typeof vi.fn>;
const mockFindUnique = db.advisor.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockCancel = cancelSubscription as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockSession.mockReset();
  mockFindUnique.mockReset();
  mockCancel.mockReset();
});

describe("POST /api/billing/cancel", () => {
  it("returns 401 without a session", async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 400 when the advisor has no active subscription", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockFindUnique.mockResolvedValue({ id: "adv1", mpPreapprovalId: null });
    const res = await POST();
    expect(res.status).toBe(400);
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it("cancels in Mercado Pago without touching plan/paidUntil locally", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockFindUnique.mockResolvedValue({ id: "adv1", mpPreapprovalId: "pre1", plan: "paid", paidUntil: "2026-07-01" });

    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockCancel).toHaveBeenCalledWith("pre1");
  });

  it("returns 500 with a friendly message when Mercado Pago errors", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockFindUnique.mockResolvedValue({ id: "adv1", mpPreapprovalId: "pre1" });
    mockCancel.mockRejectedValue(new Error("network error"));

    const res = await POST();
    expect(res.status).toBe(500);
  });
});
