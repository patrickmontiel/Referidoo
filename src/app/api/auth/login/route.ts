import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, signToken, isPlatformOwner, setAdvisorCookie } from "@/lib/auth";
import { isRateLimited, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit por IP: 10 intentos / 5 min. Frena fuerza bruta sin bloquear al
  // usuario legítimo por mucho tiempo. Clave por IP (no por email) para no
  // permitir que un atacante deje sin acceso el correo de una víctima.
  if (isRateLimited(`login:${clientIp(req)}`, 10, 5 * 60_000)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." }, { status: 429 });
  }

  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const advisor = await db.advisor.findUnique({ where: { email } });
  if (!advisor) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
  }

  const valid = await verifyPassword(password, advisor.password);
  if (!valid) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
  }

  const token = signToken({
    advisorId: advisor.id,
    email: advisor.email,
    name: advisor.name,
    emailVerified: advisor.emailVerified,
    plan: advisor.plan,
    onboardedAt: advisor.onboardedAt?.toISOString() ?? null,
  });

  const res = NextResponse.json({ ok: true, advisorId: advisor.id, isOwner: isPlatformOwner(advisor.email) });
  setAdvisorCookie(res, token);
  return res;
}
