import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken, setAdvisorCookie } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://referidoo.com";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  // Los errores aterrizan en una página PÚBLICA de confirmación (no en /admin,
  // que sin sesión rebota a /login). El caso típico: el asesor reenvió el correo
  // y cada reenvío invalida los links anteriores — al abrir uno viejo, el token
  // ya no existe. Nunca debe pedir iniciar sesión: solo explicar y guiar.
  if (!token) {
    return NextResponse.redirect(new URL("/correo-verificado?estado=falta", BASE_URL));
  }

  const advisor = await db.advisor.findUnique({ where: { verificationToken: token } });
  if (!advisor) {
    return NextResponse.redirect(new URL("/correo-verificado?estado=expirado", BASE_URL));
  }

  await db.advisor.update({
    where: { id: advisor.id },
    data: { emailVerified: true, verificationToken: null },
  });

  const sessionToken = signToken({
    advisorId: advisor.id,
    email: advisor.email,
    name: advisor.name,
    emailVerified: true,
    plan: advisor.plan,
    onboardedAt: advisor.onboardedAt?.toISOString() ?? null,
  });
  // Aterriza en una confirmación ligera (no en un /admin fresco): esa página
  // avisa en vivo a la pestaña donde la asesora ya estaba trabajando y le pide
  // volver ahí, en vez de invitarla a empezar de cero en esta pestaña nueva y
  // abandonar (perder) el cliente que iba a medias en la otra.
  const res = NextResponse.redirect(new URL("/correo-verificado", BASE_URL));
  setAdvisorCookie(res, sessionToken);
  return res;
}
