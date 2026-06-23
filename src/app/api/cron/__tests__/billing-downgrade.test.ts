import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: { advisor: { updateMany: vi.fn() } },
}));

import { db } from "@/lib/db";
import { GET } from "../billing-downgrade/route";

const mockUpdateMany = db.advisor.updateMany as unknown as ReturnType<typeof vi.fn>;

function cronRequest(secret?: string) {
  return new NextRequest("http://localhost:3050/api/cron/billing-downgrade", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  mockUpdateMany.mockReset().mockResolvedValue({ count: 0 });
  process.env.CRON_SECRET = "test-cron-secret";
});

describe("GET /api/cron/billing-downgrade", () => {
  it("returns 401 without the correct CRON_SECRET", async () => {
    const res = await GET(cronRequest("wrong"));
    expect(res.status).toBe(401);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("downgrades advisors whose paidUntil already passed", async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 2 }).mockResolvedValueOnce({ count: 0 });
    const res = await GET(cronRequest("test-cron-secret"));
    const data = await res.json();
    expect(data.expiredDowngraded).toBe(2);
    expect(mockUpdateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { plan: "paid", paidUntil: { lt: expect.any(Date) } },
      data: { plan: "freemium", paymentFailedAt: null },
    }));
  });

  it("downgrades advisors whose payment has been failing past the grace period", async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 3 });
    const res = await GET(cronRequest("test-cron-secret"));
    const data = await res.json();
    expect(data.failedGraceDowngraded).toBe(3);
    expect(mockUpdateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { plan: "paid", paymentFailedAt: { lt: expect.any(Date) } },
      data: { plan: "freemium" },
    }));
  });
});
