import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, signToken, setAdvisorCookie } from "@/lib/auth";
import { createSubscription, mercadoPagoErrorMessage } from "@/lib/mercadopago";

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { cardTokenId } = await req.json().catch(() => ({}));
  if (!cardTokenId) {
    return NextResponse.json({ error: "Falta el token de la tarjeta" }, { status: 400 });
  }

  const advisor = await db.advisor.findUnique({ where: { id: session.advisorId } });
  if (!advisor) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (advisor.plan === "paid") {
    return NextResponse.json({ error: "Ya tienes el plan pagado" }, { status: 400 });
  }

  try {
    const { preapprovalId, status } = await createSubscription(advisor, cardTokenId);

    const isPaid = status === "authorized";
    await db.advisor.update({
      where: { id: advisor.id },
      data: {
        mpPreapprovalId: preapprovalId,
        ...(isPaid ? { plan: "paid", paidUntil: new Date(Date.now() + ONE_MONTH_MS) } : {}),
      },
    });

    const res = NextResponse.json({ ok: true, status });

    if (isPaid) {
      const newToken = signToken({
        advisorId: advisor.id,
        email: advisor.email,
        name: advisor.name,
        emailVerified: advisor.emailVerified,
        plan: "paid",
        onboardedAt: advisor.onboardedAt?.toISOString() ?? null,
      });
      setAdvisorCookie(res, newToken);
    }

    return res;
  } catch (err) {
    console.error("[billing] Error creando suscripción:", err);
    return NextResponse.json({ error: mercadoPagoErrorMessage(err) }, { status: 500 });
  }
}
