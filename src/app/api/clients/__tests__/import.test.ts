import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    client: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    advisor: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({
  getAdvisorSession: vi.fn(),
}));

import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { POST } from "../import/route";

const mockSession = getAdvisorSession as unknown as ReturnType<typeof vi.fn>;
const mockClientFindMany = db.client.findMany as unknown as ReturnType<typeof vi.fn>;
const mockClientCreate = db.client.create as unknown as ReturnType<typeof vi.fn>;
const mockClientCount = db.client.count as unknown as ReturnType<typeof vi.fn>;
const mockAdvisorFindUnique = db.advisor.findUnique as unknown as ReturnType<typeof vi.fn>;

function postRequest(rows: unknown) {
  return new NextRequest("http://localhost:3050/api/clients/import", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
}

beforeEach(() => {
  mockSession.mockReset();
  mockClientFindMany.mockReset().mockResolvedValue([]);
  mockClientCreate.mockReset().mockImplementation(async ({ data }) => ({ id: "c-" + data.name, ...data }));
  mockClientCount.mockReset().mockResolvedValue(0);
  mockAdvisorFindUnique.mockReset();
  mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
});

describe("POST /api/clients/import", () => {
  it("returns 401 when there is no session", async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(postRequest([{ name: "Ana" }]));
    expect(res.status).toBe(401);
  });

  it("returns 400 when rows is empty", async () => {
    const res = await POST(postRequest([]));
    expect(res.status).toBe(400);
  });

  it("reports an error for rows with an empty name without creating them", async () => {
    mockAdvisorFindUnique.mockResolvedValue({ plan: "paid", emailVerified: true });
    const res = await POST(postRequest([{ name: "" }, { name: "Ana" }]));
    const data = await res.json();
    expect(data.created).toBe(1);
    expect(data.failed).toBe(1);
    expect(data.results[0]).toMatchObject({ ok: false, error: "Nombre vacío" });
  });

  it("creates all rows for a paid (unlimited) advisor", async () => {
    mockAdvisorFindUnique.mockResolvedValue({ plan: "paid", emailVerified: true });
    const res = await POST(postRequest([{ name: "Ana" }, { name: "Beto" }]));
    const data = await res.json();
    expect(data.created).toBe(2);
    expect(data.failed).toBe(0);
  });

  it("blocks all rows with the verification message when the advisor is unverified", async () => {
    mockAdvisorFindUnique.mockResolvedValue({ plan: "freemium", emailVerified: false });
    const res = await POST(postRequest([{ name: "Ana" }]));
    const data = await res.json();
    expect(data.created).toBe(0);
    expect(data.results[0].error).toMatch(/verifica tu correo/i);
    expect(mockClientCreate).not.toHaveBeenCalled();
  });

  it("creates all rows for a verified freemium advisor (no client count limit)", async () => {
    mockAdvisorFindUnique.mockResolvedValue({ plan: "freemium", emailVerified: true });

    const res = await POST(postRequest([{ name: "Ana" }, { name: "Beto" }, { name: "Caro" }]));
    const data = await res.json();

    expect(data.created).toBe(3);
    expect(data.failed).toBe(0);
  });
});
