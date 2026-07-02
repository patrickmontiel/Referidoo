import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { LESSIO_COMMISSION_SINCE } from "@/app/api/owner/summary/route";

const UNCLASSIFIED = "sin clasificar";

export async function GET() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const referrals = await db.referral.findMany({
    where: { status: "converted", lessioCommission: { not: null } },
    select: { productType: true, lessioCommission: true },
  });

  const totals = new Map<string, number>();
  for (const r of referrals) {
    const key = r.productType ?? UNCLASSIFIED;
    totals.set(key, (totals.get(key) ?? 0) + (r.lessioCommission ?? 0));
  }

  const breakdown = Array.from(totals.entries())
    .map(([productType, commission]) => ({ productType, commission }))
    .sort((a, b) => b.commission - a.commission);

  return NextResponse.json({ breakdown, lessioCommissionSince: LESSIO_COMMISSION_SINCE });
}
