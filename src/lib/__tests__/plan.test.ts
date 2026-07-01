import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  db: {
    advisor: { findUnique: vi.fn() },
    client: { count: vi.fn() },
  },
}));

import { db } from "../db";
import { canAdvisorAddClients, remainingClientQuota, gateErrorMessage, FREEMIUM_LEAD_LIMIT } from "../plan";

const mockFindUnique = db.advisor.findUnique as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFindUnique.mockReset();
});

describe("canAdvisorAddClients", () => {
  it("blocks when the advisor's email is not verified", async () => {
    mockFindUnique.mockResolvedValue({ emailVerified: false });
    const result = await canAdvisorAddClients("adv1");
    expect(result).toEqual({ allowed: false, reason: "unverified" });
  });

  it("blocks when the advisor record does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await canAdvisorAddClients("missing");
    expect(result).toEqual({ allowed: false, reason: "unverified" });
  });

  it("allows any verified advisor — no client cap in freemium", async () => {
    mockFindUnique.mockResolvedValue({ emailVerified: true });
    const result = await canAdvisorAddClients("adv1");
    expect(result).toEqual({ allowed: true });
  });
});

describe("remainingClientQuota", () => {
  it("returns null (unlimited) for verified advisors", async () => {
    mockFindUnique.mockResolvedValue({ emailVerified: true });
    const result = await remainingClientQuota("adv1");
    expect(result).toEqual({ remaining: null });
  });

  it("returns 0 with reason=unverified for unverified advisors", async () => {
    mockFindUnique.mockResolvedValue({ emailVerified: false });
    const result = await remainingClientQuota("adv1");
    expect(result).toEqual({ remaining: 0, reason: "unverified" });
  });
});

describe("gateErrorMessage", () => {
  it("returns a verification-specific message", () => {
    expect(gateErrorMessage("unverified")).toMatch(/verifica tu correo/i);
  });
});

describe("FREEMIUM_LEAD_LIMIT", () => {
  it("is 12", () => {
    expect(FREEMIUM_LEAD_LIMIT).toBe(12);
  });
});
