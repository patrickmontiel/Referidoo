import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    advisor: { findMany: vi.fn(), update: vi.fn() },
    planEvent: { create: vi.fn() },
  },
}));
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getAdvisorSession: vi.fn() };
});

import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { GET } from "../route";
import { PATCH } from "../[id]/route";
import { NextRequest } from "next/server";

const mockSession = getAdvisorSession as unknown as ReturnType<typeof vi.fn>;
const mockFindMany = db.advisor.findMany as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = db.advisor.update as unknown as ReturnType<typeof vi.fn>;
const mockPlanEvent = db.planEvent.create as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockSession.mockReset();
  mockFindMany.mockReset();
  mockUpdate.mockReset();
  mockPlanEvent.mockReset();
  mockPlanEvent.mockResolvedValue({});
  process.env.PLATFORM_OWNER_EMAIL = "patrick@referidoo.com";
});

function listRequest(cursor?: string) {
  const url = cursor
    ? `http://localhost:3050/api/admin/advisors?cursor=${cursor}`
    : "http://localhost:3050/api/admin/advisors";
  return new NextRequest(url);
}

describe("GET /api/admin/advisors", () => {
  it("returns 403 when there is no session", async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(listRequest());
    expect(res.status).toBe(403);
  });

  it("returns 403 when the session email is not the platform owner", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "not-owner@x.com" });
    const res = await GET(listRequest());
    expect(res.status).toBe(403);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns the advisor list (minimal fields only) for the platform owner, with nextCursor null under a page", async () => {
    mockSession.mockResolvedValue({ advisorId: "owner1", email: "patrick@referidoo.com" });
    mockFindMany.mockResolvedValue([{ id: "adv1", name: "Ana", email: "ana@x.com", plan: "freemium", emailVerified: true, createdAt: new Date(), paidUntil: null, paymentFailedAt: null, mpPreapprovalId: null }]);

    const res = await GET(listRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.advisors).toHaveLength(1);
    expect(body.nextCursor).toBeNull();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          emailVerified: true,
          createdAt: true,
          deletedAt: true,
          paidUntil: true,
          paymentFailedAt: true,
          mpPreapprovalId: true,
        },
        take: 51,
      })
    );
    expect(mockFindMany.mock.calls[0][0]).not.toHaveProperty("cursor");
  });

  it("returns nextCursor when there are more rows than the page size", async () => {
    mockSession.mockResolvedValue({ advisorId: "owner1", email: "patrick@referidoo.com" });
    const rows = Array.from({ length: 51 }, (_, i) => ({
      id: `adv${i}`, name: `A${i}`, email: `a${i}@x.com`, plan: "freemium", emailVerified: true,
      createdAt: new Date(), paidUntil: null, paymentFailedAt: null, mpPreapprovalId: null,
    }));
    mockFindMany.mockResolvedValue(rows);

    const res = await GET(listRequest());
    const body = await res.json();
    expect(body.advisors).toHaveLength(50);
    expect(body.nextCursor).toBe("adv50");
  });

  it("passes the cursor through to the query when provided", async () => {
    mockSession.mockResolvedValue({ advisorId: "owner1", email: "patrick@referidoo.com" });
    mockFindMany.mockResolvedValue([]);

    await GET(listRequest("adv1"));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: "adv1" }, skip: 1 })
    );
  });
});

describe("PATCH /api/admin/advisors/[id]", () => {
  function patchRequest(plan: unknown, compDays?: unknown) {
    return new NextRequest("http://localhost:3050/api/admin/advisors/adv1", {
      method: "PATCH",
      body: JSON.stringify(compDays === undefined ? { plan } : { plan, compDays }),
    });
  }

  /** El `data` con el que se llamó a advisor.update. */
  function updateData() {
    return mockUpdate.mock.calls[0][0].data as {
      plan: string;
      paidUntil: Date | null;
      paymentFailedAt: null;
    };
  }

  function asOwner() {
    mockSession.mockResolvedValue({ advisorId: "owner1", email: "patrick@referidoo.com" });
    mockUpdate.mockResolvedValue({ id: "adv1", plan: "paid" });
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
    asOwner();
    const res = await PATCH(patchRequest("paid"), { params: Promise.resolve({ id: "adv1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "adv1" } })
    );
    expect(updateData().plan).toBe("paid");
  });

  // ── REGRESIÓN ──────────────────────────────────────────────────────────────
  // El upgrade manual escribía SOLO `plan: "paid"`, dejando `paidUntil` en null.
  // El cron billing-downgrade baja a freemium a todo `plan="paid"` con
  // `paidUntil=null` + sin suscripción de MP + registrado hace +30 días, así que
  // el regalo se revertía en la siguiente corrida ("sube de nivel y luego se
  // quita"). El invariante que lo evita: si plan="paid", `paidUntil` SIEMPRE es
  // una fecha futura.
  describe("un comp sobrevive al cron de downgrade", () => {
    it("al subir a pagado fija paidUntil en el futuro (nunca null)", async () => {
      asOwner();
      const antes = Date.now();
      await PATCH(patchRequest("paid"), { params: Promise.resolve({ id: "adv1" }) });

      const { paidUntil } = updateData();
      expect(paidUntil).toBeInstanceOf(Date);
      // La condición exacta que usa el cron para expirar: paidUntil < now.
      expect(paidUntil!.getTime()).toBeGreaterThan(antes);
    });

    it("sin compDays regala 30 días", async () => {
      asOwner();
      const antes = Date.now();
      await PATCH(patchRequest("paid"), { params: Promise.resolve({ id: "adv1" }) });

      const dias = (updateData().paidUntil!.getTime() - antes) / 86_400_000;
      expect(dias).toBeGreaterThan(29.9);
      expect(dias).toBeLessThan(30.1);
    });

    it("respeta los compDays que manda el owner", async () => {
      asOwner();
      const antes = Date.now();
      await PATCH(patchRequest("paid", 90), { params: Promise.resolve({ id: "adv1" }) });

      const dias = (updateData().paidUntil!.getTime() - antes) / 86_400_000;
      expect(dias).toBeGreaterThan(89.9);
      expect(dias).toBeLessThan(90.1);
    });

    it("acota compDays absurdos al máximo de 730 días", async () => {
      asOwner();
      const antes = Date.now();
      await PATCH(patchRequest("paid", 99_999), { params: Promise.resolve({ id: "adv1" }) });

      const dias = (updateData().paidUntil!.getTime() - antes) / 86_400_000;
      expect(dias).toBeLessThan(730.1);
    });

    // Un valor basura nunca debe dejar paidUntil en null: sería el bug otra vez.
    it.each([0, -5, "treinta", null, NaN])(
      "con compDays inválido (%s) cae al default y NO deja paidUntil en null",
      async (bad) => {
        asOwner();
        await PATCH(patchRequest("paid", bad), { params: Promise.resolve({ id: "adv1" }) });
        expect(updateData().paidUntil).toBeInstanceOf(Date);
        expect(updateData().paidUntil!.getTime()).toBeGreaterThan(Date.now());
      }
    );
  });

  it("al bajar a freemium limpia la fecha de corte", async () => {
    asOwner();
    await PATCH(patchRequest("freemium"), { params: Promise.resolve({ id: "adv1" }) });
    expect(updateData()).toEqual({ plan: "freemium", paidUntil: null, paymentFailedAt: null });
  });

  it("registra comp_granted al regalar y comp_revoked al quitar", async () => {
    asOwner();
    await PATCH(patchRequest("paid"), { params: Promise.resolve({ id: "adv1" }) });
    expect(mockPlanEvent).toHaveBeenCalledWith({
      data: { advisorId: "adv1", event: "comp_granted" },
    });

    mockPlanEvent.mockClear();
    mockUpdate.mockClear();
    await PATCH(patchRequest("freemium"), { params: Promise.resolve({ id: "adv1" }) });
    expect(mockPlanEvent).toHaveBeenCalledWith({
      data: { advisorId: "adv1", event: "comp_revoked" },
    });
  });

  it("un fallo al registrar el PlanEvent no rompe el upgrade", async () => {
    asOwner();
    mockPlanEvent.mockRejectedValue(new Error("db caída"));
    const res = await PATCH(patchRequest("paid"), { params: Promise.resolve({ id: "adv1" }) });
    expect(res.status).toBe(200);
  });
});
