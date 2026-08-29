import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTrialDowngradedEmail } from "@/lib/email";

const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;
const TRIAL_MS = 30 * 24 * 60 * 60 * 1000;

// Red de seguridad si un webhook de Mercado Pago se pierde: baja a freemium
// a quien ya pasó su `paidUntil` sin renovar, o lleva 3+ días con un cobro
// fallido sin resolverse.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const graceCutoff = new Date(now.getTime() - GRACE_PERIOD_MS);
  const trialCutoff = new Date(now.getTime() - TRIAL_MS);

  // updateMany solo devuelve { count }, no los registros afectados — hay que
  // capturar los IDs antes de actualizar para poder registrar el PlanEvent
  // de cada asesor downgradeado.
  const expiredAdvisors = await db.advisor.findMany({
    where: { plan: "paid", paidUntil: { lt: now } },
    select: { id: true, name: true, email: true, mpPreapprovalId: true },
  });
  const expired = await db.advisor.updateMany({
    where: { plan: "paid", paidUntil: { lt: now } },
    data: { plan: "freemium", paymentFailedAt: null },
  });
  await db.planEvent.createMany({
    data: expiredAdvisors.map((a) => ({ advisorId: a.id, event: "cancelled" })),
  }).catch((err) => console.error("[cron/billing-downgrade] Error registrando PlanEvent cancelled (expired):", err));

  // Aviso de downgrade (antes era silencioso). Solo a quienes estaban en su
  // trial (sin suscripción de MP); a un suscriptor que lapsó el pago no le
  // mandamos "tu prueba terminó". Fire-and-forget: no bloquea el cron.
  for (const a of expiredAdvisors.filter((x) => !x.mpPreapprovalId)) {
    sendTrialDowngradedEmail({ advisorEmail: a.email, advisorName: a.name })
      .catch((err) => console.error("[cron/billing-downgrade] Error avisando downgrade a", a.email, err));
  }

  const failedTooLongAdvisors = await db.advisor.findMany({
    where: { plan: "paid", paymentFailedAt: { lt: graceCutoff } },
    select: { id: true },
  });
  const failedTooLong = await db.advisor.updateMany({
    where: { plan: "paid", paymentFailedAt: { lt: graceCutoff } },
    data: { plan: "freemium" },
  });
  await db.planEvent.createMany({
    data: failedTooLongAdvisors.map((a) => ({ advisorId: a.id, event: "cancelled" })),
  }).catch((err) => console.error("[cron/billing-downgrade] Error registrando PlanEvent cancelled (grace):", err));

  // Red de seguridad: "paid" fijado a mano sin fecha de corte ni suscripción
  // de MP. Sin esto se quedan en Pro gratis para siempre (era el bug original).
  // Si ya llevan más de un mes registrados, se les baja a freemium.
  const staleTrialAdvisors = await db.advisor.findMany({
    where: { plan: "paid", paidUntil: null, mpPreapprovalId: null, createdAt: { lt: trialCutoff } },
    select: { id: true },
  });
  const staleTrial = await db.advisor.updateMany({
    where: { plan: "paid", paidUntil: null, mpPreapprovalId: null, createdAt: { lt: trialCutoff } },
    data: { plan: "freemium" },
  });
  await db.planEvent.createMany({
    data: staleTrialAdvisors.map((a) => ({ advisorId: a.id, event: "cancelled" })),
  }).catch((err) => console.error("[cron/billing-downgrade] Error registrando PlanEvent cancelled (stale trial):", err));

  return NextResponse.json({
    expiredDowngraded: expired.count,
    failedGraceDowngraded: failedTooLong.count,
    staleTrialDowngraded: staleTrial.count,
  });
}
