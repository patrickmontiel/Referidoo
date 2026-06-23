import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { advisor: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/auth", () => ({ getAdvisorSession: vi.fn() }));
vi.mock("@/lib/mercadopago", () => ({ createSubscription: vi.fn() }));

import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { createSubscription } from "@/lib/mercadopago";
import { POST } from "../subscribe/route";

const mockSession = getAdvisorSession as unknown as ReturnType<typeof vi.fn>;
const mockFindUnique = db.advisor.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = db.advisor.update as unknown as ReturnType<typeof vi.fn>;
const mockCreateSubscription = createSubscription as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockSession.mockReset();
  mockFindUnique.mockReset();
  mockUpdate.mockReset();
  mockCreateSubscription.mockReset();
});

describe("POST /api/billing/subscribe", () => {
  it("returns 401 without a session", async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 400 if the advisor already has the paid plan", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockFindUnique.mockResolvedValue({ id: "adv1", plan: "paid" });
    const res = await POST();
    expect(res.status).toBe(400);
    expect(mockCreateSubscription).not.toHaveBeenCalled();
  });

  it("creates a subscription, saves the preapproval id, and returns the checkout URL", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockFindUnique.mockResolvedValue({ id: "adv1", plan: "freemium", email: "a@b.com", name: "Ana" });
    mockCreateSubscription.mockResolvedValue({ preapprovalId: "pre1", initPoint: "https://mp.test/checkout/pre1" });

    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.checkoutUrl).toBe("https://mp.test/checkout/pre1");
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "adv1" }, data: { mpPreapprovalId: "pre1" } });
  });

  it("returns 500 with a friendly message when Mercado Pago errors", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockFindUnique.mockResolvedValue({ id: "adv1", plan: "freemium", email: "a@b.com", name: "Ana" });
    mockCreateSubscription.mockRejectedValue(new Error("MP_ACCESS_TOKEN no configurado"));

    const res = await POST();
    expect(res.status).toBe(500);
  });
});
