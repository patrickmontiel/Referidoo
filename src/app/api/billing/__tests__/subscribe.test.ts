import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: { advisor: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/auth", () => ({ getAdvisorSession: vi.fn() }));
vi.mock("@/lib/mercadopago", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mercadopago")>();
  return { ...actual, createSubscription: vi.fn() };
});

import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { createSubscription } from "@/lib/mercadopago";
import { POST } from "../subscribe/route";

const mockSession = getAdvisorSession as unknown as ReturnType<typeof vi.fn>;
const mockFindUnique = db.advisor.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = db.advisor.update as unknown as ReturnType<typeof vi.fn>;
const mockCreateSubscription = createSubscription as unknown as ReturnType<typeof vi.fn>;

function subscribeRequest(body: unknown = { cardTokenId: "token123" }) {
  return new NextRequest("http://localhost:3050/api/billing/subscribe", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockSession.mockReset();
  mockFindUnique.mockReset();
  mockUpdate.mockReset().mockResolvedValue({});
  mockCreateSubscription.mockReset();
});

describe("POST /api/billing/subscribe", () => {
  it("returns 401 without a session", async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(subscribeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 400 when cardTokenId is missing", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    const res = await POST(subscribeRequest({}));
    expect(res.status).toBe(400);
    expect(mockCreateSubscription).not.toHaveBeenCalled();
  });

  it("returns 400 if the advisor already has the paid plan", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockFindUnique.mockResolvedValue({ id: "adv1", plan: "paid" });
    const res = await POST(subscribeRequest());
    expect(res.status).toBe(400);
    expect(mockCreateSubscription).not.toHaveBeenCalled();
  });

  it("authorizes the subscription, sets plan=paid + paidUntil, and saves the preapproval id", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockFindUnique.mockResolvedValue({ id: "adv1", plan: "freemium", email: "a@b.com", name: "Ana" });
    mockCreateSubscription.mockResolvedValue({ preapprovalId: "pre1", status: "authorized" });

    const res = await POST(subscribeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("authorized");
    expect(mockCreateSubscription).toHaveBeenCalledWith(
      { id: "adv1", plan: "freemium", email: "a@b.com", name: "Ana" },
      "token123"
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "adv1" },
        data: expect.objectContaining({ mpPreapprovalId: "pre1", plan: "paid" }),
      })
    );
  });

  it("does not set plan=paid when the subscription comes back pending (not authorized)", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockFindUnique.mockResolvedValue({ id: "adv1", plan: "freemium", email: "a@b.com", name: "Ana" });
    mockCreateSubscription.mockResolvedValue({ preapprovalId: "pre1", status: "pending" });

    await POST(subscribeRequest());
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "adv1" }, data: { mpPreapprovalId: "pre1" } });
  });

  it("returns 500 blaming the card when Mercado Pago rejects it (4xx, generic)", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockFindUnique.mockResolvedValue({ id: "adv1", plan: "freemium", email: "a@b.com", name: "Ana" });
    mockCreateSubscription.mockRejectedValue({ message: "card declined", api_response: { status: 400 } });

    const res = await POST(subscribeRequest());
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toMatch(/verifica los datos de tu tarjeta/i);
  });

  it("returns a token-expired message when the error mentions the card token", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockFindUnique.mockResolvedValue({ id: "adv1", plan: "freemium", email: "a@b.com", name: "Ana" });
    mockCreateSubscription.mockRejectedValue({ message: "card_token_id is required or expired", api_response: { status: 400 } });

    const res = await POST(subscribeRequest());
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toMatch(/caducaron/i);
  });

  it("returns a Mercado Pago outage message on a persistent 5xx (already retried by the SDK)", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockFindUnique.mockResolvedValue({ id: "adv1", plan: "freemium", email: "a@b.com", name: "Ana" });
    mockCreateSubscription.mockRejectedValue({ message: "internal server error", api_response: { status: 500 } });

    const res = await POST(subscribeRequest());
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toMatch(/no está respondiendo/i);
  });
});
