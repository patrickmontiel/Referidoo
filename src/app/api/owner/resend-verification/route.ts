import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { advisorId, email } = body;
  if (!advisorId && !email) {
    return NextResponse.json({ error: "advisorId o email requerido" }, { status: 400 });
  }

  const advisor = await db.advisor.findFirst({
    where: advisorId ? { id: advisorId } : { email: email as string },
    select: { id: true, name: true, email: true, emailVerified: true, deletedAt: true },
  });

  if (!advisor) {
    return NextResponse.json({ error: "Asesor no encontrado" }, { status: 404 });
  }

  // No enviar a cuentas dadas de baja — deben re-registrarse
  if (advisor.deletedAt) {
    return NextResponse.json({ error: "Cuenta dada de baja — el asesor debe registrarse de nuevo en /registro" }, { status: 409 });
  }

  if (advisor.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const verificationToken = randomBytes(32).toString("hex");
  await db.advisor.update({ where: { id: advisor.id }, data: { verificationToken } });

  await sendVerificationEmail({
    advisorEmail: advisor.email,
    advisorName: advisor.name,
    verificationToken,
  });

  return NextResponse.json({ ok: true });
}
