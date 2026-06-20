import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { advisor: { findMany: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/auth", () => ({
  getAdvisorSession: vi.fn(),
}));

import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { GET } from "../route";
import { PATCH } from "../[id]/route";
import { NextRequest } from "next/server";

const mockSession = getAdvisorSession as unknown as ReturnType<typeof vi.fn>;
const mockFindMany = db.advisor.findMany as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = db.advisor.update as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockSession.mockReset();
  mockFindMany.mockReset();
  mockUpdate.mockReset();
  process.env.PLATFORM_OWNER_EMAIL = "patrick@referidoo.com";
});

describe("GET /api/admin/advisors", () => {
  it("returns 403 when there is no session", async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 403 when the session email is not the platform owner", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "not-owner@x.com" });
    const res = await GET();
    expect(res.status).toBe(403);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns the advisor list (minimal fields only) for the platform owner", async () => {
    mockSession.mockResolvedValue({ advisorId: "owner1", email: "patrick@referidoo.com" });
    mockFindMany.mockResolvedValue([{ id: "adv1", name: "Ana", email: "ana@x.com", plan: "freemium", emailVerified: true, createdAt: new Date() }]);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, name: true, email: true, plan: true, emailVerified: true, createdAt: true },
      })
    );
  });
});

describe("PATCH /api/admin/advisors/[id]", () => {
  function patchRequest(plan: unknown) {
    return new NextRequest("http://localhost:3050/api/admin/advisors/adv1", {
      method: "PATCH",
      body: JSON.stringify({ plan }),
    });
  }

  it("returns 403 when the session email is not the platform owner", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "not-owner@x.com" });
    const res = await PATCH(patchRequest("paid"), { params: Promise.resolve({ id: "adv1" }) });
    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid plan value", async () => {
    mockSession.mockResolvedValue({ advisorId: "owner1", email: "patrick@referidoo.com" });
    const res = await PATCH(patchRequest("enterprise"), { params: Promise.resolve({ id: "adv1" }) });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("updates the plan for the platform owner with a valid value", async () => {
    mockSession.mockResolvedValue({ advisorId: "owner1", email: "patrick@referidoo.com" });
    mockUpdate.mockResolvedValue({ id: "adv1", plan: "paid" });

    const res = await PATCH(patchRequest("paid"), { params: Promise.resolve({ id: "adv1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "adv1" }, data: { plan: "paid" } })
    );
  });
});
