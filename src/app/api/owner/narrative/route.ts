import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";
import { computeMorosos, computeOwnerProblems } from "@/lib/owner-problems";
import { generateOwnerNarrative } from "@/lib/owner-narrative-ai";

// Independiente del selector de periodo de /owner (mes/90d/todo) — el
// briefing siempre refleja el estado operativo actual, no una ventana de
// tiempo elegida en la UI. Por eso vive en su propio endpoint en vez de
// colgarse de /api/owner/overview.
export async function GET() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [advisors, referrals] = await Promise.all([
    db.advisor.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, plan: true, createdAt: true, paymentFailedAt: true },
    }),
    db.referral.findMany({
      where: { advisor: { deletedAt: null } },
      select: {
        advisorId: true,
        leadName: true,
        status: true,
        saleAmount: true,
        productType: true,
        lessioCommission: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const morosos = await computeMorosos(now);
  const problems = computeOwnerProblems({ advisors, referrals, morosos, now });

  const proCount = advisors.filter((a) => a.plan === "paid").length;
  const mrr = proCount * MONTHLY_PRICE_MXN;
  const convertedThisMonth = referrals.filter((r) => r.status === "converted" && r.updatedAt >= monthStart);
  const commissionTotal = convertedThisMonth.reduce((s, r) => s + (r.lessioCommission ?? 0), 0);

  const narrative = await generateOwnerNarrative({
    problems,
    proCount,
    activeCount: advisors.length,
    mrr,
    commissionTotal,
    conversionsCount: convertedThisMonth.length,
  });

  return NextResponse.json({ narrative, problemsCount: problems.length });
}
