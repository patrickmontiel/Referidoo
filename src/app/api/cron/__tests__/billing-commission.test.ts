import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    advisor: { findMany: vi.fn() },
    referral: { findMany: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("@/lib/mercadopago", () => ({
  MONTHLY_PRICE_MXN: 539,
  updateSubscriptionAmount: vi.fn(),
}));

import { db } from "@/lib/db";
import { updateSubscriptionAmount } from "@/lib/mercadopago";
import { GET } from "../billing-commission/route";

const mockFindManyAdvisor = db.advisor.findMany as unknown as ReturnType<typeof vi.fn>;
const mockFindManyReferral = db.referral.findMany as unknown as ReturnType<typeof vi.fn>;
const mockUpdateManyReferral = db.referral.updateMany as unknown as ReturnType<typeof vi.fn>;
const mockUpdateAmount = updateSubscriptionAmount as unknown as ReturnType<typeof vi.fn>;

function cronRequest(secret?: string) {
  return new NextRequest("http://localhost:3050/api/cron/billing-commission", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  mockFindManyAdvisor.mockReset().mockResolvedValue([]);
  mockFindManyReferral.mockReset().mockResolvedValue([]);
  mockUpdateManyReferral.mockReset().mockResolvedValue({ count: 0 });
  mockUpdateAmount.mockReset().mockResolvedValue(undefined);
  process.env.CRON_SECRET = "test-cron-secret";
});

describe("GET /api/cron/billing-commission", () => {
  it("returns 401 without the correct CRON_SECRET", async () => {
    const res = await GET(cronRequest("wrong"));
    expect(res.status).toBe(401);
    expect(mockFindManyAdvisor).not.toHaveBeenCalled();
  });

  it("suma la comisión pendiente y actualiza el monto en Mercado Pago", async () => {
    mockFindManyAdvisor.mockResolvedValueOnce([{ id: "advisor-1", mpPreapprovalId: "preapproval-1" }]);
    mockFindManyReferral.mockResolvedValueOnce([
      { id: "ref-1", lessioCommission: 100 },
      { id: "ref-2", lessioCommission: 50 },
    ]);

    const res = await GET(cronRequest("test-cron-secret"));
    const data = await res.json();

    expect(mockUpdateAmount).toHaveBeenCalledWith("preapproval-1", 689); // 539 + 150
    expect(mockUpdateManyReferral).toHaveBeenCalledWith({
      where: { id: { in: ["ref-1", "ref-2"] } },
      data: { billedAt: expect.any(Date) },
    });
    expect(data.billed).toBe(1);
    expect(data.skippedNoCommission).toBe(0);
    expect(data.failed).toBe(0);
  });

  it("no llama a Mercado Pago si no hay comisión pendiente", async () => {
    mockFindManyAdvisor.mockResolvedValueOnce([{ id: "advisor-1", mpPreapprovalId: "preapproval-1" }]);
    mockFindManyReferral.mockResolvedValueOnce([]);

    const res = await GET(cronRequest("test-cron-secret"));
    const data = await res.json();

    expect(mockUpdateAmount).not.toHaveBeenCalled();
    expect(mockUpdateManyReferral).not.toHaveBeenCalled();
    expect(data.skippedNoCommission).toBe(1);
  });

  it("no marca billedAt si el PUT a Mercado Pago falla — la comisión queda pendiente para el siguiente ciclo", async () => {
    mockFindManyAdvisor.mockResolvedValueOnce([{ id: "advisor-1", mpPreapprovalId: "preapproval-1" }]);
    mockFindManyReferral.mockResolvedValueOnce([{ id: "ref-1", lessioCommission: 100 }]);
    mockUpdateAmount.mockRejectedValueOnce(new Error("Mercado Pago no responde"));

    const res = await GET(cronRequest("test-cron-secret"));
    const data = await res.json();

    expect(mockUpdateManyReferral).not.toHaveBeenCalled();
    expect(data.failed).toBe(1);
    expect(data.billed).toBe(0);
  });
});
