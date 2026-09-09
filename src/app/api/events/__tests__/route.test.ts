import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    client: { findUnique: vi.fn(), findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({
  getAdvisorSession: vi.fn(),
}));
// Espiamos el tracking pero conservamos el whitelist/normalizeChannel reales.
vi.mock("@/lib/track", async () => {
  const actual = await vi.importActual<typeof import("@/lib/track")>("@/lib/track");
  return { ...actual, trackProductEvent: vi.fn(), trackProductEventOnce: vi.fn() };
});

import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { trackProductEvent, trackProductEventOnce } from "@/lib/track";
import { __resetRateLimit } from "@/lib/rate-limit";
import { POST } from "../route";

const mFindUnique = db.client.findUnique as unknown as ReturnType<typeof vi.fn>;
const mFindFirst = db.client.findFirst as unknown as ReturnType<typeof vi.fn>;
const mSession = getAdvisorSession as unknown as ReturnType<typeof vi.fn>;
const mTrack = trackProductEvent as unknown as ReturnType<typeof vi.fn>;
const mTrackOnce = trackProductEventOnce as unknown as ReturnType<typeof vi.fn>;

function post(body: unknown) {
  return new NextRequest("http://localhost:3050/api/events", {
    method: "POST",
    headers: { "x-forwarded-for": "9.9.9.9" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mFindUnique.mockReset();
  mFindFirst.mockReset();
  mSession.mockReset();
  mTrack.mockReset();
  mTrackOnce.mockReset();
  __resetRateLimit();
});

describe("POST /api/events", () => {
  it("rechaza un evento fuera del whitelist (p. ej. server-only) con 400", async () => {
    const res = await POST(post({ event: "referral_created", code: "abc" }));
    expect(res.status).toBe(400);
    expect(mTrack).not.toHaveBeenCalled();
  });

  it("rechaza un evento inventado con 400", async () => {
    const res = await POST(post({ event: "algo_raro" }));
    expect(res.status).toBe(400);
    expect(mTrack).not.toHaveBeenCalled();
  });

  it("referral_landing_viewed deriva asesor/cliente del code en el SERVIDOR (ignora IDs del browser)", async () => {
    mFindFirst.mockResolvedValue({ id: "cli1", advisorId: "adv-real", referralCode: "codigo" });
    // El browser intenta colar un advisorId falso — debe ignorarse.
    const res = await POST(post({ event: "referral_landing_viewed", code: "codigo", advisorId: "adv-falso" }));
    expect(res.status).toBe(204);
    expect(mTrack).toHaveBeenCalledWith(
      "referral_landing_viewed",
      expect.objectContaining({ advisorId: "adv-real", clientId: "cli1", referralCode: "codigo" })
    );
  });

  it("portal_link_sent exige sesión (401 sin autenticar)", async () => {
    mSession.mockResolvedValue(null);
    const res = await POST(post({ event: "portal_link_sent", clientId: "cli1" }));
    expect(res.status).toBe(401);
    expect(mTrack).not.toHaveBeenCalled();
  });

  it("portal_link_sent NO permite atribuir un cliente ajeno (404, sin evento)", async () => {
    mSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mFindFirst.mockResolvedValue(null); // el cliente no pertenece al asesor
    const res = await POST(post({ event: "portal_link_sent", clientId: "cli-de-otro" }));
    expect(res.status).toBe(404);
    expect(mTrack).not.toHaveBeenCalled();
  });

  it("portal_link_sent válido registra con el advisorId de la sesión y el canal", async () => {
    mSession.mockResolvedValue({ advisorId: "adv1", email: "a@b.com" });
    mFindFirst.mockResolvedValue({ id: "cli1" });
    const res = await POST(post({ event: "portal_link_sent", clientId: "cli1", channel: "whatsapp" }));
    expect(res.status).toBe(204);
    expect(mTrack).toHaveBeenCalledWith(
      "portal_link_sent",
      expect.objectContaining({ advisorId: "adv1", clientId: "cli1", channel: "whatsapp" })
    );
  });

  it("client_portal_opened usa la variante deduplicada (una apertura por cliente)", async () => {
    mFindUnique.mockResolvedValue({ id: "cli1", advisorId: "adv1" });
    const res = await POST(post({ event: "client_portal_opened", token: "tok123" }));
    expect(res.status).toBe(204);
    expect(mTrackOnce).toHaveBeenCalledWith(
      "client_portal_opened",
      { clientId: "cli1" },
      expect.objectContaining({ advisorId: "adv1", clientId: "cli1" })
    );
    expect(mTrack).not.toHaveBeenCalled(); // no usa la versión sin dedupe
  });

  it("un token de Cliente A NO puede atribuirse a Cliente B (se ignoran clientId/advisorId del browser)", async () => {
    // El token resuelve a cli-A/adv-A; el browser intenta colar cli-B/adv-B/referralId falsos.
    mFindUnique.mockResolvedValue({ id: "cli-A", advisorId: "adv-A" });
    const res = await POST(
      post({ event: "referral_share_clicked", token: "tokA", clientId: "cli-B", advisorId: "adv-B", referralId: "ref-falso", channel: "whatsapp" })
    );
    expect(res.status).toBe(204);
    expect(mTrack).toHaveBeenCalledWith(
      "referral_share_clicked",
      expect.objectContaining({ advisorId: "adv-A", clientId: "cli-A", channel: "whatsapp" })
    );
    // Nunca escribe el clientId/advisorId/referralId enviados por el browser.
    const ctx = mTrack.mock.calls[0]![1];
    expect(ctx.clientId).toBe("cli-A");
    expect(ctx.advisorId).toBe("adv-A");
    expect(ctx.referralId).toBeUndefined();
  });

  it("un token inválido es un no-op silencioso (204, sin evento) — no filtra existencia", async () => {
    mFindUnique.mockResolvedValue(null);
    const res = await POST(post({ event: "client_portal_opened", token: "no-existe" }));
    expect(res.status).toBe(204);
    expect(mTrack).not.toHaveBeenCalled();
    expect(mTrackOnce).not.toHaveBeenCalled();
  });

  it("un channel arbitrario se normaliza a null (no se inyecta metadata libre)", async () => {
    mFindUnique.mockResolvedValue({ id: "cli1", advisorId: "adv1" });
    const res = await POST(post({ event: "referral_share_clicked", token: "tok", channel: "<script>evil</script>" }));
    expect(res.status).toBe(204);
    expect(mTrack).toHaveBeenCalledWith(
      "referral_share_clicked",
      expect.objectContaining({ channel: null })
    );
  });

  it("referral_landing_viewed ignora referralId/PII extra del browser (solo persiste lo derivado del code)", async () => {
    mFindFirst.mockResolvedValue({ id: "cli1", advisorId: "adv1", referralCode: "codigo" });
    const res = await POST(
      post({ event: "referral_landing_viewed", code: "codigo", referralId: "ref-falso", leadName: "Fulano", leadPhone: "5551234567" })
    );
    expect(res.status).toBe(204);
    const ctx = mTrack.mock.calls[0]![1];
    expect(ctx.referralId).toBeUndefined(); // referralId nunca viene del browser
    expect(ctx.referralCode).toBe("codigo"); // derivado del servidor
    // No hay ningún campo de PII en el contexto persistido.
    expect(Object.keys(ctx)).toEqual(expect.arrayContaining(["advisorId", "clientId", "referralCode"]));
    expect(ctx).not.toHaveProperty("leadName");
    expect(ctx).not.toHaveProperty("leadPhone");
  });
});
