import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    referral: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn(), delete: vi.fn() },
    client: { findUnique: vi.fn(), update: vi.fn() },
    advisorSettings: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ getAdvisorSession: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendReferralApprovedNotification: vi.fn().mockResolvedValue(undefined),
  sendPaymentSentNotification: vi.fn().mockResolvedValue(undefined),
}));
// Las funciones puras (isEscaleraProduct, getBubblePointsForProduct,
// calculateLessioCommission, ESCALERA_PRODUCTS) se mantienen reales —
// ya están cubiertas por rewards.test.ts y permiten probar la lógica de
// ramificación de esta ruta contra reglas de negocio de verdad, no contra
// un mock que finge el resultado. Solo se mockean las funciones que tocan
// DB/cache (getAdvisorTiers, getAdvisorBubbleSettings,
// calculateRewardForNextReferral) — unstable_cache no corre de forma
// confiable fuera de un request real de Next, y ningún test existente en
// el repo las había ejercitado antes.
vi.mock("@/lib/rewards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rewards")>();
  return {
    ...actual,
    getAdvisorTiers: vi.fn().mockResolvedValue([]),
    getAdvisorBubbleSettings: vi.fn().mockResolvedValue({ autoPoints: 150, gmmPoints: 300, claimThreshold: 500 }),
    calculateRewardForNextReferral: vi.fn(),
  };
});

import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { sendReferralApprovedNotification, sendPaymentSentNotification } from "@/lib/email";
import { calculateRewardForNextReferral } from "@/lib/rewards";
import { PATCH, DELETE } from "../route";

const mockSession = getAdvisorSession as unknown as ReturnType<typeof vi.fn>;
const mockFindUnique = db.referral.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockCount = db.referral.count as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = db.referral.update as unknown as ReturnType<typeof vi.fn>;
const mockDelete = db.referral.delete as unknown as ReturnType<typeof vi.fn>;
const mockClientFindUnique = db.client.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockClientUpdate = db.client.update as unknown as ReturnType<typeof vi.fn>;
const mockNextReferral = calculateRewardForNextReferral as unknown as ReturnType<typeof vi.fn>;

function patchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3050/api/referrals/r1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

function baseReferral(overrides: Record<string, unknown> = {}) {
  return {
    id: "r1",
    advisorId: "adv1",
    referrerId: "client1",
    leadName: "Lead Uno",
    leadPhone: "555",
    leadEmail: null,
    leadNotes: null,
    tierPosition: 0,
    rewardAmount: 0,
    status: "pending",
    rewardStatus: "pending",
    saleAmount: null,
    productType: null,
    interestProductType: null,
    lessioCommission: null,
    referrer: { name: "Ana" },
    advisor: { name: "Eduardo", email: "eduardo@referidoo.mx", plan: "paid" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.mockResolvedValue({ advisorId: "adv1", email: "eduardo@referidoo.mx" });
  mockUpdate.mockImplementation((args: { data: Record<string, unknown> }) => Promise.resolve({ id: "r1", ...args.data }));
  mockCount.mockResolvedValue(0);
  mockClientFindUnique.mockResolvedValue({ createdAt: new Date(), launchBonusUsed: false, bubblePoints: 0, accessToken: "tok", email: "ana@x.com", name: "Ana" });
  mockClientUpdate.mockResolvedValue({});
  mockNextReferral.mockResolvedValue({ amount: 1500, tierPosition: 1 });
});

describe("PATCH /api/referrals/[id] — auth & ownership", () => {
  it("returns 401 without a session", async () => {
    mockSession.mockResolvedValue(null);
    const res = await PATCH(patchRequest({ status: "converted" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the referral does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await PATCH(patchRequest({ status: "converted" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 when the referral belongs to a different advisor", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ advisorId: "other-advisor" }));
    const res = await PATCH(patchRequest({ status: "converted" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/referrals/[id] — conversión escalera (Vida/PPR)", () => {
  it("asks for the next tier when there was no previous escalera slot", async () => {
    mockFindUnique.mockResolvedValue(baseReferral());
    mockCount.mockResolvedValue(2);
    mockNextReferral.mockResolvedValue({ amount: 1500, tierPosition: 2 });

    const res = await PATCH(patchRequest({ status: "converted", productType: "Vida" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(200);
    expect(mockNextReferral).toHaveBeenCalledWith("adv1", 2);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tierPosition: 2, rewardAmount: 1500 }) }));
  });

  it("keeps the existing tier/reward when re-converting after a de-conversion (previouslyHadEscaleraSlot)", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ status: "contacted", tierPosition: 1, rewardAmount: 1500, rewardStatus: "approved" }));

    const res = await PATCH(patchRequest({ status: "converted", productType: "Vida" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(200);
    expect(mockNextReferral).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ tierPosition: expect.anything() }) }));
  });
});

describe("PATCH /api/referrals/[id] — conversión burbuja (Daños/Auto, GMM, Otro)", () => {
  it("sets tier/reward to zero and releases the launch bonus if it occupied tier 1 unpaid", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ status: "contacted", tierPosition: 1, rewardAmount: 1500, rewardStatus: "approved" }));

    const res = await PATCH(patchRequest({ status: "converted", productType: "Daños/Auto" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tierPosition: 0, rewardAmount: 0 }) }));
    expect(mockClientUpdate).toHaveBeenCalledWith({ where: { id: "client1" }, data: { launchBonusUsed: false } });
  });

  it("does not release the launch bonus if the previous slot was already paid", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ status: "contacted", tierPosition: 1, rewardAmount: 1500, rewardStatus: "paid" }));

    await PATCH(patchRequest({ status: "converted", productType: "GMM" }), { params: Promise.resolve({ id: "r1" }) });
    expect(mockClientUpdate).not.toHaveBeenCalledWith({ where: { id: "client1" }, data: { launchBonusUsed: false } });
  });
});

describe("PATCH /api/referrals/[id] — edición de producto post-conversión (isProductTypeEdit)", () => {
  it("escalera -> burbuja: libera el escalón y suma puntos burbuja del nuevo producto", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ status: "converted", productType: "Vida", tierPosition: 1, rewardAmount: 1500, rewardStatus: "approved" }));

    const res = await PATCH(patchRequest({ productType: "Daños/Auto" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tierPosition: 0, rewardAmount: 0 }) }));
    expect(mockClientUpdate).toHaveBeenCalledWith({ where: { id: "client1" }, data: { bubblePoints: 150 } });
  });

  it("burbuja -> escalera: asigna el siguiente escalón y resta los puntos burbuja previos", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ status: "converted", productType: "GMM", tierPosition: 0, rewardAmount: 0, rewardStatus: "approved" }));
    mockClientFindUnique.mockResolvedValue({ createdAt: new Date(), launchBonusUsed: false, bubblePoints: 300, accessToken: "tok", email: "ana@x.com", name: "Ana" });
    mockCount.mockResolvedValue(0);
    mockNextReferral.mockResolvedValue({ amount: 1500, tierPosition: 1 });

    const res = await PATCH(patchRequest({ productType: "Vida" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tierPosition: 1, rewardAmount: 1500 }) }));
    expect(mockClientUpdate).toHaveBeenCalledWith({ where: { id: "client1" }, data: { bubblePoints: Math.max(0, 300 - 300) } });
  });

  it("burbuja -> burbuja: ajusta solo la diferencia de puntos", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ status: "converted", productType: "Daños/Auto", tierPosition: 0, rewardAmount: 0, rewardStatus: "approved" }));
    mockClientFindUnique.mockResolvedValue({ createdAt: new Date(), launchBonusUsed: false, bubblePoints: 150, accessToken: "tok", email: "ana@x.com", name: "Ana" });

    await PATCH(patchRequest({ productType: "GMM" }), { params: Promise.resolve({ id: "r1" }) });
    // Auto=150, GMM=300 -> delta = +150 -> bubblePoints 150+150=300
    expect(mockClientUpdate).toHaveBeenCalledWith({ where: { id: "client1" }, data: { bubblePoints: 300 } });
  });

  it("escalera -> escalera (Vida <-> PPR): no cambia tier/reward", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ status: "converted", productType: "Vida", tierPosition: 1, rewardAmount: 1500, rewardStatus: "approved" }));

    const res = await PATCH(patchRequest({ productType: "PPR" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ tierPosition: expect.anything() }) }));
  });

  it("no aplica isProductTypeEdit si el referido ya fue pagado", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ status: "converted", productType: "Vida", tierPosition: 1, rewardAmount: 1500, rewardStatus: "paid" }));

    const res = await PATCH(patchRequest({ productType: "Daños/Auto" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(200);
    // El productType en sí no se actualiza una vez pagado (regla preexistente)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ productType: "Daños/Auto" }) }));
  });
});

describe("PATCH /api/referrals/[id] — persistencia de lessioCommission", () => {
  it("persiste la comisión calculada al convertir con producto y monto válidos", async () => {
    mockFindUnique.mockResolvedValue(baseReferral());
    mockCount.mockResolvedValue(0);

    await PATCH(patchRequest({ status: "converted", productType: "Daños/Auto", saleAmount: 100000 }), { params: Promise.resolve({ id: "r1" }) });
    // Daños/Auto paid rate = 0.008 -> 100000 * 0.008 = 800
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lessioCommission: 800 }) }));
  });

  // Regresión: freemium paga casi el doble de comisión que pagado, decidido
  // en /office-hours 2026-06-29 — verifica que el endpoint real lea el plan
  // del asesor, no solo la función pura en rewards.ts.
  it("usa la tasa freemium (más alta) cuando el asesor está en plan freemium", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ advisor: { name: "Eduardo", email: "eduardo@referidoo.mx", plan: "freemium" } }));

    await PATCH(patchRequest({ status: "converted", productType: "Daños/Auto", saleAmount: 100000 }), { params: Promise.resolve({ id: "r1" }) });
    // Daños/Auto freemium rate = 0.015 -> 100000 * 0.015 = 1500 (vs. 800 en pagado)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lessioCommission: 1500 }) }));
  });

  it("persiste null cuando el producto no tiene tasa definida", async () => {
    mockFindUnique.mockResolvedValue(baseReferral());

    await PATCH(patchRequest({ status: "converted", productType: "Invalido", saleAmount: 100000 }), { params: Promise.resolve({ id: "r1" }) });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lessioCommission: null }) }));
  });

  it("persiste null cuando no hay saleAmount", async () => {
    mockFindUnique.mockResolvedValue(baseReferral());

    await PATCH(patchRequest({ status: "converted", productType: "Vida" }), { params: Promise.resolve({ id: "r1" }) });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lessioCommission: null }) }));
  });

  it("recalcula la comisión al corregir el producto después de convertir (isProductTypeEdit)", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ status: "converted", productType: "Daños/Auto", saleAmount: 100000, tierPosition: 0, rewardAmount: 0, rewardStatus: "approved", lessioCommission: 800 }));

    await PATCH(patchRequest({ productType: "GMM" }), { params: Promise.resolve({ id: "r1" }) });
    // GMM paid rate = 0.008 también -> 100000 * 0.008 = 800
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lessioCommission: 800 }) }));
  });

  it("no toca lessioCommission en una edición que no es conversión ni cambio de producto", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ status: "converted", productType: "Daños/Auto", saleAmount: 100000, rewardStatus: "approved", lessioCommission: 800 }));

    await PATCH(patchRequest({ leadNotes: "nota nueva" }), { params: Promise.resolve({ id: "r1" }) });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ lessioCommission: expect.anything() }) }));
  });
});

describe("PATCH /api/referrals/[id] — Bono de Inicio", () => {
  it("aplica el bono (+1000) cuando hay 3+ referidos dentro de los primeros 7 días y el cliente no lo había usado", async () => {
    mockFindUnique.mockResolvedValue(baseReferral());
    mockCount
      .mockResolvedValueOnce(0) // convertedCount para tierPosition
      .mockResolvedValueOnce(3); // countInWindow para el bono
    mockNextReferral.mockResolvedValue({ amount: 1500, tierPosition: 1 });

    const res = await PATCH(patchRequest({ status: "converted", productType: "Vida" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rewardAmount: 2500 }) }));
    expect(mockClientUpdate).toHaveBeenCalledWith({ where: { id: "client1" }, data: { launchBonusUsed: true } });
  });

  it("no aplica el bono si el cliente ya lo había usado", async () => {
    mockFindUnique.mockResolvedValue(baseReferral());
    mockClientFindUnique.mockResolvedValue({ createdAt: new Date(), launchBonusUsed: true, bubblePoints: 0, accessToken: "tok", email: "ana@x.com", name: "Ana" });
    mockCount.mockResolvedValueOnce(0);
    mockNextReferral.mockResolvedValue({ amount: 1500, tierPosition: 1 });

    await PATCH(patchRequest({ status: "converted", productType: "Vida" }), { params: Promise.resolve({ id: "r1" }) });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rewardAmount: 1500 }) }));
  });

  it("no aplica el bono si ya pasó la ventana de 7 días", async () => {
    mockFindUnique.mockResolvedValue(baseReferral());
    mockClientFindUnique.mockResolvedValue({ createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), launchBonusUsed: false, bubblePoints: 0, accessToken: "tok", email: "ana@x.com", name: "Ana" });
    mockCount.mockResolvedValueOnce(0);
    mockNextReferral.mockResolvedValue({ amount: 1500, tierPosition: 1 });

    await PATCH(patchRequest({ status: "converted", productType: "Vida" }), { params: Promise.resolve({ id: "r1" }) });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rewardAmount: 1500 }) }));
  });

  it("no aplica el bono si hay menos de 3 referidos en la ventana", async () => {
    mockFindUnique.mockResolvedValue(baseReferral());
    mockCount.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    mockNextReferral.mockResolvedValue({ amount: 1500, tierPosition: 1 });

    await PATCH(patchRequest({ status: "converted", productType: "Vida" }), { params: Promise.resolve({ id: "r1" }) });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rewardAmount: 1500 }) }));
  });
});

describe("PATCH /api/referrals/[id] — notificaciones", () => {
  it("envía la notificación de conversión y suma puntos burbuja si el producto aplica", async () => {
    mockFindUnique.mockResolvedValue(baseReferral());

    await PATCH(patchRequest({ status: "converted", productType: "GMM" }), { params: Promise.resolve({ id: "r1" }) });
    expect(sendReferralApprovedNotification).toHaveBeenCalled();
    expect(mockClientUpdate).toHaveBeenCalledWith({ where: { id: "client1" }, data: { bubblePoints: { increment: 300 } } });
  });

  it("envía la notificación de pago cuando rewardStatus pasa a paid", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ status: "converted", productType: "Vida", tierPosition: 1, rewardAmount: 1500, rewardStatus: "approved" }));

    const res = await PATCH(patchRequest({ rewardStatus: "paid" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(200);
    expect(sendPaymentSentNotification).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ paymentNote: null }) }));
  });

  it("agenda el correo de pago vía QStash cuando QSTASH_TOKEN está configurado", async () => {
    const original = process.env.QSTASH_TOKEN;
    process.env.QSTASH_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    mockFindUnique.mockResolvedValue(baseReferral({ status: "converted", productType: "Vida", tierPosition: 1, rewardAmount: 1500, rewardStatus: "approved" }));

    await PATCH(patchRequest({ rewardStatus: "paid" }), { params: Promise.resolve({ id: "r1" }) });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("qstash.upstash.io"), expect.objectContaining({ method: "POST" }));
    expect(sendPaymentSentNotification).not.toHaveBeenCalled();

    process.env.QSTASH_TOKEN = original;
    vi.unstubAllGlobals();
  });
});

describe("DELETE /api/referrals/[id]", () => {
  it("returns 401 without a session", async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(new NextRequest("http://localhost:3050/api/referrals/r1", { method: "DELETE" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the referral does not exist or belongs to another advisor", async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await DELETE(new NextRequest("http://localhost:3050/api/referrals/r1", { method: "DELETE" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(404);
  });

  it("deletes the referral and releases the launch bonus if it occupied tier 1 unpaid", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ tierPosition: 1, rewardStatus: "approved" }));
    mockDelete.mockResolvedValue({});

    const res = await DELETE(new NextRequest("http://localhost:3050/api/referrals/r1", { method: "DELETE" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(200);
    expect(mockClientUpdate).toHaveBeenCalledWith({ where: { id: "client1" }, data: { launchBonusUsed: false } });
  });

  it("does not touch the launch bonus when the deleted referral was not an unpaid tier-1 slot", async () => {
    mockFindUnique.mockResolvedValue(baseReferral({ tierPosition: 0, rewardStatus: "pending" }));
    mockDelete.mockResolvedValue({});

    const res = await DELETE(new NextRequest("http://localhost:3050/api/referrals/r1", { method: "DELETE" }), { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(200);
    expect(mockClientUpdate).not.toHaveBeenCalled();
  });
});
