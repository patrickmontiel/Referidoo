import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    client: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
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
const mockClientUpdate = db.client.update as unknown as ReturnType<typeof vi.fn>;
const mockClientCount = db.client.count as unknown as ReturnType<typeof vi.fn>;
const mockAdvisorFindUnique = db.advisor.findUnique as unknown as ReturnType<typeof vi.fn>;

function postRequest(body: unknown) {
  return new NextRequest("http://localhost:3050/api/clients/import", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockSession.mockReset();
  mockClientFindMany.mockReset().mockResolvedValue([]);
  mockClientCreate.mockReset().mockImplementation(async ({ data }) => ({ id: "c-" + data.name, ...data }));
  mockClientUpdate.mockReset().mockImplementation(async ({ where, data }) => ({ id: where.id, ...data }));
  mockClientCount.mockReset().mockResolvedValue(0);
  mockAdvisorFindUnique.mockReset();
  mockSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
});

describe("POST /api/clients/import — conectar cartera", () => {
  it("returns 401 when there is no session", async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(postRequest({ rows: [{ name: "Ana" }] }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when rows is empty", async () => {
    const res = await POST(postRequest({ rows: [] }));
    expect(res.status).toBe(400);
  });

  it("omite filas sin nombre sin crearlas", async () => {
    mockAdvisorFindUnique.mockResolvedValue({ plan: "paid", emailVerified: true });
    const res = await POST(postRequest({ rows: [{ name: "" }, { name: "Ana", phone: "5511112222" }] }));
    const data = await res.json();
    expect(data.created).toBe(1);
    expect(data.skipped).toBe(1);
    expect(data.summary.faltaDato).toBe(1);
  });

  it("crea todas las filas para un asesor verificado", async () => {
    mockAdvisorFindUnique.mockResolvedValue({ plan: "paid", emailVerified: true });
    const res = await POST(postRequest({ rows: [{ name: "Ana", phone: "5511110001" }, { name: "Beto", phone: "5511110002" }] }));
    const data = await res.json();
    expect(data.created).toBe(2);
    expect(data.skipped).toBe(0);
  });

  it("bloquea todo cuando el asesor no ha verificado su correo", async () => {
    mockAdvisorFindUnique.mockResolvedValue({ plan: "freemium", emailVerified: false });
    const res = await POST(postRequest({ rows: [{ name: "Ana", phone: "5511110001" }] }));
    const data = await res.json();
    expect(data.created).toBe(0);
    expect(data.results[0].reason).toMatch(/verifica tu correo/i);
    expect(mockClientCreate).not.toHaveBeenCalled();
  });

  // ── CARTERA PERSISTENTE ──

  it("PREVIEW no escribe nada y devuelve el resumen", async () => {
    mockAdvisorFindUnique.mockResolvedValue({ plan: "paid", emailVerified: true });
    mockClientFindMany.mockResolvedValue([
      { id: "c1", name: "Ana", normalizedPhone: "5511110001", normalizedEmail: null },
    ]);
    const res = await POST(
      postRequest({
        preview: true,
        rows: [{ name: "Ana", phone: "55 1111 0001" }, { name: "Nuevo", phone: "5599990000" }],
      })
    );
    const data = await res.json();
    expect(data.preview).toBe(true);
    expect(data.summary.yaExisten).toBe(1);
    expect(data.summary.nuevos).toBe(1);
    expect(mockClientCreate).not.toHaveBeenCalled();
    expect(mockClientUpdate).not.toHaveBeenCalled();
  });

  it("REIMPORT IDEMPOTENTE: reimportar la misma cartera actualiza y NO crea", async () => {
    mockAdvisorFindUnique.mockResolvedValue({ plan: "paid", emailVerified: true });
    mockClientFindMany.mockResolvedValue([
      { id: "c1", name: "Ana", normalizedPhone: "5511110001", normalizedEmail: "ana@x.com" },
      { id: "c2", name: "Beto", normalizedPhone: "5511110002", normalizedEmail: "beto@x.com" },
    ]);
    const res = await POST(
      postRequest({ rows: [{ name: "Ana", phone: "+52 55 1111 0001" }, { name: "Beto", phone: "5511110002" }] })
    );
    const data = await res.json();
    expect(data.created).toBe(0); // ← el conteo de cartera NO crece
    expect(data.updated).toBe(2);
    expect(mockClientCreate).not.toHaveBeenCalled();
  });

  it("al actualizar NO toca referralCode ni accessToken (los links siguen sirviendo)", async () => {
    mockAdvisorFindUnique.mockResolvedValue({ plan: "paid", emailVerified: true });
    mockClientFindMany.mockResolvedValue([
      { id: "c1", name: "Ana", normalizedPhone: "5511110001", normalizedEmail: null },
    ]);
    await POST(postRequest({ rows: [{ name: "Ana Actualizada", phone: "5511110001", email: "nueva@x.com" }] }));
    expect(mockClientUpdate).toHaveBeenCalledTimes(1);
    const updateArg = mockClientUpdate.mock.calls[0][0];
    expect(updateArg.where.id).toBe("c1");
    expect(updateArg.data).not.toHaveProperty("referralCode");
    expect(updateArg.data).not.toHaveProperty("accessToken");
    expect(updateArg.data.name).toBe("Ana Actualizada");
  });

  it("POSIBLE_DUPLICADO no se auto-fusiona (default: omitir)", async () => {
    mockAdvisorFindUnique.mockResolvedValue({ plan: "paid", emailVerified: true });
    mockClientFindMany.mockResolvedValue([
      { id: "c1", name: "Ana", normalizedPhone: "5511110001", normalizedEmail: "ana@x.com" },
    ]);
    const res = await POST(postRequest({ rows: [{ name: "Ana", email: "ana@x.com", phone: "5599999999" }] }));
    const data = await res.json();
    expect(data.summary.posiblesDuplicados).toBe(1);
    expect(data.created).toBe(0);
    expect(data.updated).toBe(0);
    expect(data.skipped).toBe(1);
  });

  it("POSIBLE_DUPLICADO resuelto como 'update' actualiza al existente", async () => {
    mockAdvisorFindUnique.mockResolvedValue({ plan: "paid", emailVerified: true });
    mockClientFindMany.mockResolvedValue([
      { id: "c1", name: "Ana", normalizedPhone: "5511110001", normalizedEmail: "ana@x.com" },
    ]);
    const res = await POST(
      postRequest({ rows: [{ name: "Ana", email: "ana@x.com", phone: "5599999999" }], resolutions: { "0": "update" } })
    );
    const data = await res.json();
    expect(data.updated).toBe(1);
    expect(mockClientUpdate).toHaveBeenCalled();
  });
});
