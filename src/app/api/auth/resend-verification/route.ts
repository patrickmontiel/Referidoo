import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { isRateLimited } from "@/lib/rate-limit";

export async function POST() {
  const session = await getAdvisorSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Rate limit por asesor autenticado: 3 reenvíos / 10 min (evita spamear el
  // buzón del propio usuario). Clave por advisorId, no por email → no filtra
  // existencia de correos.
  if (isRateLimited(`resend:${session.advisorId}`, 3, 10 * 60_000)) {
    return NextResponse.json({ error: "Ya enviamos varios correos. Espera unos minutos." }, { status: 429 });
  }

  const advisor = await db.advisor.findUnique({
    where: { id: session.advisorId },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  if (!advisor) {
    return NextResponse.json({ error: "Asesor no encontrado" }, { status: 404 });
  }

  if (advisor.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const verificationToken = randomBytes(32).toString("hex");

  await db.advisor.update({
    where: { id: advisor.id },
    data: { verificationToken },
  });

  await sendVerificationEmail({
    advisorEmail: advisor.email,
    advisorName: advisor.name,
    verificationToken,
  });

  return NextResponse.json({ ok: true });
}
