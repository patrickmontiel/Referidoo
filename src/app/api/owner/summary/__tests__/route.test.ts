import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    advisor: { count: vi.fn() },
    referral: { aggregate: vi.fn() },
  },
}));
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getAdvisorSession: vi.fn() };
});

import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { GET, LESSIO_COMMISSION_SINCE } from "../route";

const mockSession = getAdvisorSession as unknown as ReturnType<typeof vi.fn>;
const mockCount = db.advisor.count as unknown as ReturnType<typeof vi.fn>;
const mockAggregate = db.referral.aggregate as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockSession.mockReset();
  mockCount.mockReset();
  mockAggregate.mockReset();
  process.env.PLATFORM_OWNER_EMAIL = "patrick@referidoo.com";
});

describe("GET /api/owner/summary", () => {
  it("returns 403 without a session", async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 403 when the session email is not the platform owner", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "not-owner@x.com" });
    const res = await GET();
    expect(res.status).toBe(403);
    expect(mockCount).not.toHaveBeenCalled();
  });

  it("computes MRR from paid advisors and sums lessioCommission via aggregate (not findMany)", async () => {
    mockSession.mockResolvedValue({ advisorId: "owner1", email: "patrick@referidoo.com" });
    mockCount.mockResolvedValue(3);
    mockAggregate.mockResolvedValue({ _sum: { lessioCommission: 240 } });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockCount).toHaveBeenCalledWith({ where: { plan: "paid" } });
    expect(mockAggregate).toHaveBeenCalledWith(
      expect.objectContaining({ _sum: { lessioCommission: true } })
    );
    expect(data).toEqual({
      mrr: 3 * 539,
      paidAdvisorsCount: 3,
      lessioCommissionTotal: 240,
      lessioCommissionSince: LESSIO_COMMISSION_SINCE,
    });
  });

  it("returns 0 commission total when no referral has a persisted commission yet", async () => {
    mockSession.mockResolvedValue({ advisorId: "owner1", email: "patrick@referidoo.com" });
    mockCount.mockResolvedValue(0);
    mockAggregate.mockResolvedValue({ _sum: { lessioCommission: null } });

    const res = await GET();
    const data = await res.json();
    expect(data.mrr).toBe(0);
    expect(data.lessioCommissionTotal).toBe(0);
  });
});
