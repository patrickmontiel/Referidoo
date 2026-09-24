import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockSend = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));
vi.mock("@/lib/db", () => ({
  db: {
    advisor: { findMany: vi.fn() },
    advisorSettings: { findMany: vi.fn() },
    rewardTier: { findMany: vi.fn() },
    client: { findMany: vi.fn() },
    referral: { findMany: vi.fn() },
    bubbleClaim: { findMany: vi.fn() },
    planEvent: { findMany: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { GET } from "../backup/route";
import { decryptBackup } from "@/lib/backup-crypto";

const CLABE = "012180012345678901";
const TOKEN = "tok_portal_secreto";

function cronRequest() {
  return new NextRequest("http://localhost:3050/api/cron/backup", {
    headers: { authorization: "Bearer test-cron-secret" },
  });
}

const ENV = { ...process.env };

beforeEach(() => {
  mockSend.mockReset().mockResolvedValue({ error: null });
  for (const t of ["advisor", "advisorSettings", "rewardTier", "client", "referral", "bubbleClaim", "planEvent"] as const) {
    (db[t].findMany as unknown as ReturnType<typeof vi.fn>).mockReset().mockResolvedValue([]);
  }
  // Datos sensibles reales: la CLABE de un referido y el token de portal de un cliente.
  (db.referral.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
    { id: "r1", leadName: "Beto", leadPhone: "5512345678", clabe: CLABE },
  ]);
  (db.client.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
    { id: "c1", name: "Ana", accessToken: TOKEN },
  ]);
  (db.advisor.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
    { id: "a1", email: "asesor@x.com", password: "hash-que-no-debe-viajar" },
  ]);

  process.env.CRON_SECRET = "test-cron-secret";
  process.env.PLATFORM_OWNER_EMAIL = "owner@x.com";
  process.env.RESEND_API_KEY = "re_test";
});

afterEach(() => {
  process.env = { ...ENV };
});

/** El adjunto del último correo enviado, decodificado de base64. */
function adjunto() {
  const att = mockSend.mock.calls[0][0].attachments?.[0];
  return att ? { filename: att.filename as string, buffer: Buffer.from(att.content as string, "base64") } : null;
}

describe("GET /api/cron/backup", () => {
  it("rechaza sin el CRON_SECRET", async () => {
    const res = await GET(new NextRequest("http://localhost:3050/api/cron/backup"));
    expect(res.status).toBe(401);
    expect(mockSend).not.toHaveBeenCalled();
  });

  describe("con BACKUP_ENCRYPTION_KEY configurada", () => {
    beforeEach(() => {
      process.env.BACKUP_ENCRYPTION_KEY = "passphrase-de-prueba-larga";
    });

    it("adjunta el respaldo cifrado y descifrable", async () => {
      const res = await GET(cronRequest());
      expect(res.status).toBe(200);

      const a = adjunto();
      expect(a!.filename).toMatch(/\.json\.enc$/);
      const json = decryptBackup(a!.buffer, "passphrase-de-prueba-larga");
      expect(JSON.parse(json).data.referrals[0].clabe).toBe(CLABE);
    });

    // El punto de todo esto.
    it("el adjunto NO lleva CLABE ni tokens de portal en claro", async () => {
      await GET(cronRequest());
      const crudo = adjunto()!.buffer.toString("latin1");
      expect(crudo).not.toContain(CLABE);
      expect(crudo).not.toContain(TOKEN);
      expect(crudo).not.toContain("5512345678");
      expect(crudo).not.toContain("clabe");
    });

    it("sigue excluyendo los hashes de contraseña", async () => {
      await GET(cronRequest());
      const json = JSON.parse(decryptBackup(adjunto()!.buffer, "passphrase-de-prueba-larga"));
      expect(json.data.advisors[0]).not.toHaveProperty("password");
      expect(json.data.advisors[0].email).toBe("asesor@x.com");
    });
  });

  describe("sin BACKUP_ENCRYPTION_KEY", () => {
    beforeEach(() => {
      delete process.env.BACKUP_ENCRYPTION_KEY;
    });

    // Regresión: antes mandaba la base completa en claro, con CLABEs y tokens.
    it("NO adjunta nada", async () => {
      await GET(cronRequest());
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][0].attachments).toBeUndefined();
    });

    it("el correo de aviso no filtra datos y dice qué configurar", async () => {
      await GET(cronRequest());
      const { subject, text } = mockSend.mock.calls[0][0];
      expect(subject).toMatch(/SIN datos/i);
      expect(text).toContain("BACKUP_ENCRYPTION_KEY");
      expect(text).not.toContain(CLABE);
      expect(text).not.toContain(TOKEN);
    });

    it("responde 500 para que el fallo se note en los logs del cron", async () => {
      const res = await GET(cronRequest());
      expect(res.status).toBe(500);
      expect((await res.json()).reason).toBe("missing_encryption_key");
    });
  });
});
