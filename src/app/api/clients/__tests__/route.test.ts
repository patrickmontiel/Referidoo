import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    client: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), count: vi.fn() },
    advisor: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({
  getAdvisorSession: vi.fn(),
}));

import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { GET, POST } from "../route";

const mockSession = getAdvisorSession as unknown as ReturnType<typeof vi.fn>;
const mockClientFindMany = db.client.findMany as unknown as ReturnType<typeof vi.fn>;
const mockClientFindUnique = db.client.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockClientCreate = db.client.create as unknown as ReturnType<typeof vi.fn>;
const mockAdvisorFindUnique = db.advisor.findUnique as unknown as ReturnType<typeof vi.fn>;

function postRequest(body: unknown) {
  return new NextRequest("http://localhost:3050/api/clients", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockSession.mockReset();
  mockClientFindMany.mockReset().mockResolvedValue([]);
  mockClientFindUnique.mockReset();
  mockClientCreate.mockReset();
  mockAdvisorFindUnique.mockReset();
  (db.client.count as unknown as ReturnType<typeof vi.fn>).mockReset().mockResolvedValue(0);
});

describe("GET /api/clients", () => {
  it("returns 401 when there is no session", async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the advisor's clients when authenticated", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockClientFindMany.mockResolvedValue([{ id: "c1" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([{ id: "c1" }]);
  });
});

describe("POST /api/clients", () => {
  it("returns 401 when there is no session", async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(postRequest({ name: "Juan", phone: "5551234567", email: "juan@x.com" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
  });

  it("creates a client on the happy path (paid plan, verified)", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockAdvisorFindUnique.mockResolvedValue({ plan: "paid", emailVerified: true });
    mockClientFindUnique.mockResolvedValue(null);
    mockClientCreate.mockResolvedValue({ id: "c1", name: "Juan" });

    const res = await POST(postRequest({ name: "Juan", phone: "5551234567", email: "juan@x.com" }));
    expect(res.status).toBe(201);
  });

  it("allows creation for freemium plan (no client count limit — only email verification required)", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockAdvisorFindUnique.mockResolvedValue({ plan: "freemium", emailVerified: true });
    mockClientFindUnique.mockResolvedValue(null);
    mockClientCreate.mockResolvedValue({ id: "c1", name: "Juan" });

    const res = await POST(postRequest({ name: "Juan", phone: "5551234567", email: "juan@x.com" }));
    expect(res.status).toBe(201);
  });

  it("blocks creation with 403 when the advisor hasn't verified their email", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mockAdvisorFindUnique.mockResolvedValue({ plan: "paid", emailVerified: false });

    const res = await POST(postRequest({ name: "Juan", phone: "5551234567", email: "juan@x.com" }));
    expect(res.status).toBe(403);
    expect(mockClientCreate).not.toHaveBeenCalled();
  });
});
