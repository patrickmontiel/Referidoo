import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

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

  // updateMany solo devuelve { count }, no los registros afectados — hay que
  // capturar los IDs antes de actualizar para poder registrar el PlanEvent
  // de cada asesor downgradeado.
  const expiredAdvisors = await db.advisor.findMany({
    where: { plan: "paid", paidUntil: { lt: now } },
    select: { id: true },
  });
  const expired = await db.advisor.updateMany({
    where: { plan: "paid", paidUntil: { lt: now } },
    data: { plan: "freemium", paymentFailedAt: null },
  });
  await db.planEvent.createMany({
    data: expiredAdvisors.map((a) => ({ advisorId: a.id, event: "cancelled" })),
  }).catch((err) => console.error("[cron/billing-downgrade] Error registrando PlanEvent cancelled (expired):", err));

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

  return NextResponse.json({
    expiredDowngraded: expired.count,
    failedGraceDowngraded: failedTooLong.count,
  });
}
