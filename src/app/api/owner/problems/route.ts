import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";

// Mismo umbral de 3 días que ya usa el cron de downgrade (GRACE_PERIOD_MS en
// billing-downgrade/route.ts) — reusado por consistencia, no inventado.
const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

export async function GET() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const graceCutoff = new Date(Date.now() - GRACE_PERIOD_MS);

  const [failedPayments, stuckReferrals] = await Promise.all([
    db.advisor.findMany({
      where: { plan: "paid", paymentFailedAt: { not: null } },
      select: { id: true, name: true, email: true, paymentFailedAt: true },
      orderBy: { paymentFailedAt: "asc" },
    }),
    db.referral.findMany({
      where: {
        status: "pending",
        confirmedByReferrer: false,
        createdAt: { lt: graceCutoff },
      },
      select: {
        id: true,
        leadName: true,
        createdAt: true,
        advisor: { select: { name: true } },
        referrer: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    failedPayments: failedPayments.map((a) => ({
      advisorId: a.id,
      advisorName: a.name,
      advisorEmail: a.email,
      failedAt: a.paymentFailedAt,
      pastGracePeriod: a.paymentFailedAt ? a.paymentFailedAt < graceCutoff : false,
    })),
    stuckReferrals: stuckReferrals.map((r) => ({
      referralId: r.id,
      leadName: r.leadName,
      advisorName: r.advisor.name,
      referrerName: r.referrer.name,
      createdAt: r.createdAt,
    })),
  });
}
