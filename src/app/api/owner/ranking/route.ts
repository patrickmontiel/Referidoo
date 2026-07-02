import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function GET() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const monthStart = startOfCurrentMonth();

  const advisors = await db.advisor.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      deletedAt: true,
      referrals: {
        where: { status: "converted" },
        select: {
          productType: true,
          lessioCommission: true,
          rewardAmount: true,
          saleAmount: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const ranking = advisors.map((a) => {
    const converted = a.referrals;
    const convertedTotal = converted.length;

    const thisMonth = converted.filter((r) => r.updatedAt >= monthStart);
    const convertedThisMonth = thisMonth.length;
    const commissionThisMonth = thisMonth.reduce(
      (sum, r) => sum + (r.lessioCommission ?? 0),
      0
    );
    const commissionAllTime = converted.reduce(
      (sum, r) => sum + (r.lessioCommission ?? 0),
      0
    );

    // Breakdown by product (all time)
    const productMap = new Map<
      string,
      { count: number; commission: number; rewardTotal: number }
    >();
    for (const r of converted) {
      const key = r.productType ?? "Sin clasificar";
      const prev = productMap.get(key) ?? { count: 0, commission: 0, rewardTotal: 0 };
      productMap.set(key, {
        count: prev.count + 1,
        commission: prev.commission + (r.lessioCommission ?? 0),
        rewardTotal: prev.rewardTotal + (r.rewardAmount ?? 0),
      });
    }
    const breakdown = Array.from(productMap.entries())
      .map(([productType, v]) => ({ productType, ...v }))
      .sort((a, b) => b.count - a.count);

    return {
      advisorId: a.id,
      advisorName: a.name,
      advisorEmail: a.email,
      isDeleted: a.deletedAt !== null,
      deletedAt: a.deletedAt?.toISOString() ?? null,
      commissionThisMonth,
      commissionAllTime,
      convertedTotal,
      convertedThisMonth,
      breakdown,
    };
  });

  // Active first sorted by commission this month, then all-time; deleted at the bottom sorted by all-time
  const active = ranking
    .filter((r) => !r.isDeleted)
    .sort(
      (a, b) =>
        b.commissionThisMonth - a.commissionThisMonth ||
        b.commissionAllTime - a.commissionAllTime
    );

  const deleted = ranking
    .filter((r) => r.isDeleted)
    .sort((a, b) => b.commissionAllTime - a.commissionAllTime);

  return NextResponse.json({ active, deleted, monthStart });
}
