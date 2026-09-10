import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    campaignRecipient: { findUnique: vi.fn(), createMany: vi.fn() },
    client: { findMany: vi.fn() },
    referralCampaign: { create: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { resolveCampaignAttribution, createCampaign } from "@/lib/campaign";

const mRecipientFind = db.campaignRecipient.findUnique as unknown as ReturnType<typeof vi.fn>;
const mRecipientCreateMany = db.campaignRecipient.createMany as unknown as ReturnType<typeof vi.fn>;
const mClientFind = db.client.findMany as unknown as ReturnType<typeof vi.fn>;
const mCampaignCreate = db.referralCampaign.create as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mRecipientFind.mockReset();
  mRecipientCreateMany.mockReset();
  mClientFind.mockReset();
  mCampaignCreate.mockReset();
});

describe("resolveCampaignAttribution — valida el ?cr en el servidor", () => {
  it("devuelve la atribución si el recipient pertenece al cliente resuelto", async () => {
    mRecipientFind.mockResolvedValue({ id: "cr1", campaignId: "camp1", clientId: "cliA" });
    const attr = await resolveCampaignAttribution("cr1", "cliA");
    expect(attr).toEqual({ campaignId: "camp1", campaignRecipientId: "cr1" });
  });

  it("IGNORA (null) un cr de OTRO cliente — no cross-attribution", async () => {
    mRecipientFind.mockResolvedValue({ id: "cr1", campaignId: "camp1", clientId: "cliA" });
    const attr = await resolveCampaignAttribution("cr1", "cliB"); // cliente distinto
    expect(attr).toBeNull();
  });

  it("devuelve null si el cr no existe", async () => {
    mRecipientFind.mockResolvedValue(null);
    expect(await resolveCampaignAttribution("cr-fantasma", "cliA")).toBeNull();
  });

  it("devuelve null si no hay cr", async () => {
    expect(await resolveCampaignAttribution(undefined, "cliA")).toBeNull();
    expect(await resolveCampaignAttribution("", "cliA")).toBeNull();
    expect(mRecipientFind).not.toHaveBeenCalled();
  });
});

describe("createCampaign — ownership de clientes", () => {
  it("solo convierte en recipients a los clientes DEL asesor (ignora ajenos)", async () => {
    // Se pidieron 3 clientes; la DB solo devuelve 2 como propios del asesor.
    mClientFind.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    mCampaignCreate.mockResolvedValue({ id: "camp1" });
    mRecipientCreateMany.mockResolvedValue({ count: 2 });

    const res = await createCampaign({
      advisorId: "advX",
      name: "Cartera sep",
      messageTemplate: "hola {nombre} {link}",
      channel: "email",
      clientIds: ["c1", "c2", "c3-de-otro-asesor"],
    });

    expect(res).toEqual({ campaignId: "camp1", recipients: 2, skipped: 1 });
    // findMany se llamó filtrando por advisorId (ownership server-side).
    expect(mClientFind).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ advisorId: "advX" }) }));
    // createMany recibió SOLO los clientes propios.
    const createArg = mRecipientCreateMany.mock.calls[0][0];
    expect(createArg.data.map((d: { clientId: string }) => d.clientId)).toEqual(["c1", "c2"]);
    expect(createArg.data.every((d: { advisorId: string }) => d.advisorId === "advX")).toBe(true);
  });

  it("deduplica clientIds repetidos antes de crear recipients", async () => {
    mClientFind.mockResolvedValue([{ id: "c1" }]);
    mCampaignCreate.mockResolvedValue({ id: "camp2" });
    mRecipientCreateMany.mockResolvedValue({ count: 1 });
    const res = await createCampaign({ advisorId: "advX", name: "x", messageTemplate: "y {link}", channel: "whatsapp", clientIds: ["c1", "c1", "c1"] });
    expect(res.recipients).toBe(1);
    // findMany recibió el set deduplicado.
    expect(mClientFind.mock.calls[0][0].where.id.in).toEqual(["c1"]);
  });
});
