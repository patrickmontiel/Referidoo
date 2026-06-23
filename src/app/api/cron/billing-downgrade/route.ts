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

  const expired = await db.advisor.updateMany({
    where: { plan: "paid", paidUntil: { lt: now } },
    data: { plan: "freemium", paymentFailedAt: null },
  });

  const failedTooLong = await db.advisor.updateMany({
    where: { plan: "paid", paymentFailedAt: { lt: graceCutoff } },
    data: { plan: "freemium" },
  });

  return NextResponse.json({
    expiredDowngraded: expired.count,
    failedGraceDowngraded: failedTooLong.count,
  });
}
