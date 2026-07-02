import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: { advisor: { findUnique: vi.fn() } },
}));
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return { ...actual, verifyPassword: vi.fn(), signToken: vi.fn().mockReturnValue("token") };
});

import { db } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { POST } from "../login/route";

const mockFindUnique = db.advisor.findUnique as unknown as ReturnType<typeof vi.fn>;
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
  mockFindUnique.mockReset();
  mockVerifyPassword.mockReset();
  mockSignToken.mockReset();
  mockSignToken.mockReturnValue("token");
  process.env.PLATFORM_OWNER_EMAIL = "patrick@referidoo.com";
});

afterEach(() => {
  process.env.PLATFORM_OWNER_EMAIL = ORIGINAL_OWNER_EMAIL;
});

describe("POST /api/auth/login", () => {
  // Regresión: el login redirigía siempre a /admin sin avisarle al cliente
  // que la cuenta era la del dueño de la plataforma — el dueño caía en el
  // panel de asesor en vez de /owner.
  it("includes isOwner: true when the email matches PLATFORM_OWNER_EMAIL", async () => {
    mockFindUnique.mockResolvedValue({ id: "adv1", email: "patrick@referidoo.com", password: "hashed" });
    mockVerifyPassword.mockResolvedValue(true);

    const res = await POST(postRequest({ email: "patrick@referidoo.com", password: "secret123" }));
    const data = await res.json();

    expect(data.isOwner).toBe(true);
  });

  it("includes isOwner: false for a regular advisor", async () => {
    mockFindUnique.mockResolvedValue({ id: "adv2", email: "asesor@demo.com", password: "hashed" });
    mockVerifyPassword.mockResolvedValue(true);

    const res = await POST(postRequest({ email: "asesor@demo.com", password: "secret123" }));
    const data = await res.json();

    expect(data.isOwner).toBe(false);
  });

  it("signs the token with enriched advisor fields (name, emailVerified, plan, onboardedAt)", async () => {
    mockFindUnique.mockResolvedValue({
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
    mockFindUnique.mockResolvedValue({ id: "adv1", email: "patrick@referidoo.com", password: "hashed" });
    mockVerifyPassword.mockResolvedValue(false);

    const res = await POST(postRequest({ email: "patrick@referidoo.com", password: "wrong" }));
    expect(res.status).toBe(401);
  });
});
