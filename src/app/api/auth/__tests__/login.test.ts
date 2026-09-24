import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: { advisor: { findFirst: vi.fn() } },
}));
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return { ...actual, verifyPassword: vi.fn(), signToken: vi.fn().mockReturnValue("token") };
});

import { db } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { __resetRateLimit } from "@/lib/rate-limit";
import { POST } from "../login/route";

const mockFindFirst = db.advisor.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockVerifyPassword = verifyPassword as unknown as ReturnType<typeof vi.fn>;
const mockSignToken = signToken as unknown as ReturnType<typeof vi.fn>;

function postRequest(body: unknown) {
  return new NextRequest("http://localhost:3050/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const ORIGINAL_OWNER_EMAIL = process.env.PLATFORM_OWNER_EMAIL;

beforeEach(() => {
  mockFindFirst.mockReset();
  mockVerifyPassword.mockReset();
  mockSignToken.mockReset();
  mockSignToken.mockReturnValue("token");
  process.env.PLATFORM_OWNER_EMAIL = "patrick@referidoo.com";
  __resetRateLimit();
});

afterEach(() => {
  process.env.PLATFORM_OWNER_EMAIL = ORIGINAL_OWNER_EMAIL;
});

describe("POST /api/auth/login", () => {
  // Regresión: el login redirigía siempre a /admin sin avisarle al cliente
  // que la cuenta era la del dueño de la plataforma — el dueño caía en el
  // panel de asesor en vez de /owner.
  it("includes isOwner: true when the email matches PLATFORM_OWNER_EMAIL", async () => {
    mockFindFirst.mockResolvedValue({ id: "adv1", email: "patrick@referidoo.com", password: "hashed" });
    mockVerifyPassword.mockResolvedValue(true);

    const res = await POST(postRequest({ email: "patrick@referidoo.com", password: "secret123" }));
    const data = await res.json();

    expect(data.isOwner).toBe(true);
  });

  it("includes isOwner: false for a regular advisor", async () => {
    mockFindFirst.mockResolvedValue({ id: "adv2", email: "asesor@demo.com", password: "hashed" });
    mockVerifyPassword.mockResolvedValue(true);

    const res = await POST(postRequest({ email: "asesor@demo.com", password: "secret123" }));
    const data = await res.json();

    expect(data.isOwner).toBe(false);
  });

  it("signs the token with enriched advisor fields (name, emailVerified, plan, onboardedAt)", async () => {
    mockFindFirst.mockResolvedValue({
      id: "adv2",
      email: "asesor@demo.com",
      password: "hashed",
      name: "Ana",
      emailVerified: true,
      plan: "freemium",
      onboardedAt: null,
    });
    mockVerifyPassword.mockResolvedValue(true);

    await POST(postRequest({ email: "asesor@demo.com", password: "secret123" }));

    expect(mockSignToken).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ana", emailVerified: true, plan: "freemium", onboardedAt: null })
    );
  });

  it("returns 401 on wrong password", async () => {
    mockFindFirst.mockResolvedValue({ id: "adv1", email: "patrick@referidoo.com", password: "hashed" });
    mockVerifyPassword.mockResolvedValue(false);

    const res = await POST(postRequest({ email: "patrick@referidoo.com", password: "wrong" }));
    expect(res.status).toBe(401);
  });

  // ── REGRESIÓN: cuenta dada de baja ────────────────────────────────────────
  // El login buscaba por correo sin filtrar `deletedAt`, así que una cuenta dada
  // de baja podía volver a entrar con su contraseña de siempre. No alcanzaba con
  // que el soft-delete renombre el correo: el DELETE de /api/admin/advisors/[id]
  // solo escribe `deletedAt`, y en producción hay cuentas borradas con su correo
  // intacto — una de ellas con 30 clientes en su cartera.
  describe("cuentas dadas de baja", () => {
    it("pide explícitamente deletedAt: null al buscar al asesor", async () => {
      mockFindFirst.mockResolvedValue(null);
      await POST(postRequest({ email: "de-baja@x.com", password: "la-correcta" }));

      // Si alguien quita el filtro, este assert truena.
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { email: "de-baja@x.com", deletedAt: null },
      });
    });

    it("responde 401 sin verificar la contraseña ni emitir token", async () => {
      // Con el filtro puesto, Prisma no devuelve la cuenta borrada.
      mockFindFirst.mockResolvedValue(null);
      const res = await POST(postRequest({ email: "de-baja@x.com", password: "la-correcta" }));

      expect(res.status).toBe(401);
      expect(mockVerifyPassword).not.toHaveBeenCalled();
      expect(mockSignToken).not.toHaveBeenCalled();
    });

    it("no revela que la cuenta existe: mismo mensaje que una contraseña mala", async () => {
      mockFindFirst.mockResolvedValue(null);
      const baja = await POST(postRequest({ email: "de-baja@x.com", password: "x" }));

      mockFindFirst.mockResolvedValue({ id: "adv1", email: "viva@x.com", password: "hashed" });
      mockVerifyPassword.mockResolvedValue(false);
      const malaPass = await POST(postRequest({ email: "viva@x.com", password: "mala" }));

      expect(await baja.json()).toEqual(await malaPass.json());
    });
  });
});
