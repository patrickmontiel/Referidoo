import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { hashPassword, signToken, setAdvisorCookie } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
  const { name, email, password, companyName } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` },
      { status: 400 }
    );
  }

  try {
    const existing = await db.advisor.findUnique({ where: { email } });
    if (existing) {
      if (!existing.deletedAt) {
        return NextResponse.json({ error: "Este correo ya está registrado" }, { status: 409 });
      }
      // Cuenta dada de baja: libera el correo renombrándolo para que el nuevo registro arranque de cero
      await db.advisor.update({
        where: { id: existing.id },
        data: { email: `_baja_${existing.id}_${existing.email}` },
      });
    }

    const hashedPassword = await hashPassword(password);
    const verificationToken = randomBytes(32).toString("hex");

    const advisor = await db.advisor.create({
      data: {
        name,
        email,
        password: hashedPassword,
        companyName: companyName || null,
        plan: "freemium",
        emailVerified: false,
        verificationToken,
      },
    });

    await sendVerificationEmail({
      advisorEmail: advisor.email,
      advisorName: advisor.name,
      verificationToken,
    }).catch((err) => console.error("[register] Error enviando verificación:", err));

    const token = signToken({
      advisorId: advisor.id,
      email: advisor.email,
      name: advisor.name,
      emailVerified: advisor.emailVerified,
      plan: advisor.plan,
      onboardedAt: advisor.onboardedAt?.toISOString() ?? null,
    });

    const res = NextResponse.json({ ok: true, advisorId: advisor.id }, { status: 201 });
    setAdvisorCookie(res, token);
    return res;
  } catch (err: unknown) {
    // Carrera de doble-submit: el unique constraint de email truena en el
    // INSERT en vez del findUnique previo si dos requests llegan casi a la vez.
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Este correo ya está registrado" }, { status: 409 });
    }
    console.error("[register] Error creando asesor:", err);
    return NextResponse.json({ error: "Algo salió mal, intenta de nuevo" }, { status: 500 });
  }
}
