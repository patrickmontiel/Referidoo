import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: { advisor: { findUnique: vi.fn(), update: vi.fn() }, planEvent: { create: vi.fn() } },
}));
vi.mock("@/lib/mercadopago", () => ({
  verifyWebhookSignature: vi.fn(),
  getMercadoPagoConfig: vi.fn(() => ({})),
}));

const mockInvoiceGet = vi.fn();
vi.mock("mercadopago", () => ({
  Invoice: vi.fn().mockImplementation(function InvoiceMock() {
    return { get: mockInvoiceGet };
  }),
}));

import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/mercadopago";
import { POST } from "../mercadopago/route";

const mockFindUnique = db.advisor.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = db.advisor.update as unknown as ReturnType<typeof vi.fn>;
const mockPlanEventCreate = db.planEvent.create as unknown as ReturnType<typeof vi.fn>;
const mockVerify = verifyWebhookSignature as unknown as ReturnType<typeof vi.fn>;

function webhookRequest(body: unknown, dataId?: string) {
  const url = dataId
    ? `http://localhost:3050/api/webhooks/mercadopago?data.id=${dataId}`
    : "http://localhost:3050/api/webhooks/mercadopago";
  return new NextRequest(url, {
    method: "POST",
    headers: { "x-signature": "ts=1,v1=abc", "x-request-id": "r1" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockFindUnique.mockReset();
  mockUpdate.mockReset().mockResolvedValue({});
  mockPlanEventCreate.mockReset().mockResolvedValue({});
  mockVerify.mockReset();
  mockInvoiceGet.mockReset();
});

describe("POST /api/webhooks/mercadopago", () => {
  it("returns 401 when the signature is invalid", async () => {
    mockVerify.mockReturnValue(false);
    const res = await POST(webhookRequest({ type: "subscription_authorized_payment" }, "inv1"));
    expect(res.status).toBe(401);
    expect(mockInvoiceGet).not.toHaveBeenCalled();
  });

  it("on an approved authorized payment (subscription_authorized_payment), sets plan=paid, extends paidUntil, and clears paymentFailedAt", async () => {
    mockVerify.mockReturnValue(true);
    mockInvoiceGet.mockResolvedValue({ external_reference: "adv1", payment: { status: "approved" } });

    const res = await POST(webhookRequest({ type: "subscription_authorized_payment" }, "inv1"));
    expect(res.status).toBe(200);
    expect(mockInvoiceGet).toHaveBeenCalledWith({ id: "inv1" });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "adv1" },
        data: expect.objectContaining({ plan: "paid", paymentFailedAt: null }),
      })
    );
    expect(mockPlanEventCreate).toHaveBeenCalledWith({ data: { advisorId: "adv1", event: "activated" } });
  });

  // Regresión: si el pago viene APROBADO pero la escritura a la DB falla,
  // antes regresábamos 200 igual — Mercado Pago nunca reintentaba y el
  // asesor se quedaba pagado-pero-freemium para siempre.
  it("returns 500 (not 200) when an approved payment fails to persist, so Mercado Pago retries", async () => {
    mockVerify.mockReturnValue(true);
    mockInvoiceGet.mockResolvedValue({ external_reference: "adv1", payment: { status: "approved" } });
    mockUpdate.mockRejectedValue(new Error("DB connection lost"));

    const res = await POST(webhookRequest({ type: "subscription_authorized_payment" }, "inv1"));
    expect(res.status).toBe(500);
  });

  it("on a rejected authorized payment with no prior failure, sets paymentFailedAt (starts the grace clock)", async () => {
    mockVerify.mockReturnValue(true);
    mockInvoiceGet.mockResolvedValue({ external_reference: "adv1", payment: { status: "rejected" } });
    mockFindUnique.mockResolvedValue({ paymentFailedAt: null });

    await POST(webhookRequest({ type: "subscription_authorized_payment" }, "inv1"));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "adv1" }, data: expect.objectContaining({ paymentFailedAt: expect.any(Date) }) })
    );
    expect(mockPlanEventCreate).toHaveBeenCalledWith({ data: { advisorId: "adv1", event: "failed" } });
  });

  it("does not reset the grace clock on a second rejected payment while one is already running", async () => {
    mockVerify.mockReturnValue(true);
    mockInvoiceGet.mockResolvedValue({ external_reference: "adv1", payment: { status: "rejected" } });
    mockFindUnique.mockResolvedValue({ paymentFailedAt: new Date("2026-06-01") });

    await POST(webhookRequest({ type: "subscription_authorized_payment" }, "inv1"));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("ignores unrelated topic types (e.g. plain 'payment', which this integration does not use)", async () => {
    mockVerify.mockReturnValue(true);
    const res = await POST(webhookRequest({ type: "payment" }, "pay1"));
    expect(res.status).toBe(200);
    expect(mockInvoiceGet).not.toHaveBeenCalled();
  });

  it("activates the plan on subscription_preapproval authorization (first checkout)", async () => {
    mockVerify.mockReturnValue(true);
    mockFindUnique.mockResolvedValue({ id: "adv1", plan: "freemium" });

    await POST(webhookRequest({ type: "subscription_preapproval" }, "pre1"));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "adv1" }, data: expect.objectContaining({ plan: "paid" }) })
    );
  });

  it("does nothing on subscription_preapproval notification if the advisor is already paid", async () => {
    mockVerify.mockReturnValue(true);
    mockFindUnique.mockResolvedValue({ id: "adv1", plan: "paid" });

    await POST(webhookRequest({ type: "subscription_preapproval" }, "pre1"));
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
