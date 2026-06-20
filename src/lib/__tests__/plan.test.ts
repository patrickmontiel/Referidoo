import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  db: {
    advisor: { findUnique: vi.fn() },
    client: { count: vi.fn() },
  },
}));

import { db } from "../db";
import { canAdvisorAddClients, remainingClientQuota, gateErrorMessage, FREEMIUM_CLIENT_LIMIT } from "../plan";

const mockFindUnique = db.advisor.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockCount = db.client.count as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFindUnique.mockReset();
  mockCount.mockReset();
});

describe("canAdvisorAddClients", () => {
  it("blocks when the advisor's email is not verified, regardless of plan", async () => {
    mockFindUnique.mockResolvedValue({ plan: "paid", emailVerified: false });
    const result = await canAdvisorAddClients("adv1");
    expect(result).toEqual({ allowed: false, reason: "unverified" });
  });

  it("blocks when the advisor record does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await canAdvisorAddClients("missing");
    expect(result).toEqual({ allowed: false, reason: "unverified" });
  });

  it("always allows when plan is paid and email is verified", async () => {
    mockFindUnique.mockResolvedValue({ plan: "paid", emailVerified: true });
    const result = await canAdvisorAddClients("adv1");
    expect(result).toEqual({ allowed: true });
    expect(mockCount).not.toHaveBeenCalled();
  });

  it("allows freemium advisors under the client limit", async () => {
    mockFindUnique.mockResolvedValue({ plan: "freemium", emailVerified: true });
    mockCount.mockResolvedValue(FREEMIUM_CLIENT_LIMIT - 1);
    const result = await canAdvisorAddClients("adv1");
    expect(result).toEqual({ allowed: true });
  });

  it("blocks freemium advisors at or over the client limit", async () => {
    mockFindUnique.mockResolvedValue({ plan: "freemium", emailVerified: true });
    mockCount.mockResolvedValue(FREEMIUM_CLIENT_LIMIT);
    const result = await canAdvisorAddClients("adv1");
    expect(result).toEqual({ allowed: false, reason: "plan_limit" });
  });

  it("counts ALL clients ever created, not just active ones (no cycling exploit)", async () => {
    mockFindUnique.mockResolvedValue({ plan: "freemium", emailVerified: true });
    mockCount.mockResolvedValue(FREEMIUM_CLIENT_LIMIT);
    await canAdvisorAddClients("adv1");
    expect(mockCount).toHaveBeenCalledWith({ where: { advisorId: "adv1" } });
  });
});

describe("remainingClientQuota", () => {
  it("returns null (unlimited) for paid + verified advisors", async () => {
    mockFindUnique.mockResolvedValue({ plan: "paid", emailVerified: true });
    const result = await remainingClientQuota("adv1");
    expect(result).toEqual({ remaining: null });
  });

  it("returns 0 with reason=unverified for unverified advisors", async () => {
    mockFindUnique.mockResolvedValue({ plan: "freemium", emailVerified: false });
    const result = await remainingClientQuota("adv1");
    expect(result).toEqual({ remaining: 0, reason: "unverified" });
  });

  it("returns remaining slots for freemium advisors under the limit", async () => {
    mockFindUnique.mockResolvedValue({ plan: "freemium", emailVerified: true });
    mockCount.mockResolvedValue(1);
    const result = await remainingClientQuota("adv1");
    expect(result).toEqual({ remaining: FREEMIUM_CLIENT_LIMIT - 1, reason: undefined });
  });

  it("never returns negative remaining slots, and tags reason=plan_limit at zero", async () => {
    mockFindUnique.mockResolvedValue({ plan: "freemium", emailVerified: true });
    mockCount.mockResolvedValue(FREEMIUM_CLIENT_LIMIT + 5);
    const result = await remainingClientQuota("adv1");
    expect(result).toEqual({ remaining: 0, reason: "plan_limit" });
  });
});

describe("gateErrorMessage", () => {
  it("returns a verification-specific message", () => {
    expect(gateErrorMessage("unverified")).toMatch(/verifica tu correo/i);
  });

  it("returns a plan-limit-specific message mentioning the limit", () => {
    expect(gateErrorMessage("plan_limit")).toMatch(new RegExp(String(FREEMIUM_CLIENT_LIMIT)));
  });
});
