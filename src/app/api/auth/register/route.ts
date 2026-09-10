import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { hashPassword, signToken, setAdvisorCookie, isPlatformOwner } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { isRateLimited, clientIp } from "@/lib/rate-limit";

const MIN_PASSWORD_LENGTH = 8;

// Todo asesor nuevo arranca con 30 días de Pro gratis (trial). Al vencer,
// el cron billing-downgrade lo baja a freemium si no dejó una suscripción
// de Mercado Pago activa. Un "paid" sin mpPreapprovalId = está en su trial.
const TRIAL_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  // Rate limit por IP: 5 registros / 15 min. Frena la creación masiva de cuentas.
  if (isRateLimited(`register:${clientIp(req)}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." }, { status: 429 });
  }

  const { name, email, password, companyName, ref, internalToken } = await req.json();

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

    // ── ALCANCE DE ANALYTICS ──────────────────────────────────────────────
    // Un registro público NORMAL es negocio real: `analyticsExcluded = false`
    // (el default del schema). NO se decide por nombre ni por dominio de correo.
    // Solo dos casos quedan FUERA, y ambos son explícitos:
    //   1) La cuenta del DUEÑO de la plataforma (config `PLATFORM_OWNER_EMAIL`).
    //   2) Un alta marcada como interna con `internalToken`, que solo funciona
    //      si el entorno define INTERNAL_SIGNUP_SECRET (nunca en producción).
    // Así un asesor real que se registra solo entra a métricas sin aprobación
    // manual, y QA/e2e/owner no contaminan.
    const internalSecret = process.env.INTERNAL_SIGNUP_SECRET;
    const isInternalSignup =
      !!internalSecret && typeof internalToken === "string" && internalToken === internalSecret;
    const analyticsExcluded = isPlatformOwner(email) || isInternalSignup;

    const advisor = await db.advisor.create({
      data: {
        name,
        email,
        password: hashedPassword,
        companyName: companyName || null,
        plan: "paid",
        paidUntil: new Date(Date.now() + TRIAL_MS),
        emailVerified: false,
        verificationToken,
        analyticsExcluded,
      },
    });

    // Atribución del loop asesor→asesor (/unete/{slug}): se registra como
    // PlanEvent "unete:{slug}" — sin columna nueva, visible en /owner/pagos.
    if (typeof ref === "string" && ref.trim()) {
      const cleanRef = ref.trim().slice(0, 60).replace(/[^a-z0-9-]/gi, "");
      if (cleanRef) {
        await db.planEvent
          .create({ data: { advisorId: advisor.id, event: `unete:${cleanRef}` } })
          .catch((err) => console.error("[register] Error registrando atribución:", err));
      }
    }

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
