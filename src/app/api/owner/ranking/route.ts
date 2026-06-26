import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Ranking por comisión generada en el mes calendario actual. Desempate por
// número total de referidos convertidos (todo el tiempo, no solo el mes) —
// default sin confirmar con Patrick, ver Open Questions del diseño.
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
      referrals: {
        where: { status: "converted" },
        select: { lessioCommission: true, updatedAt: true },
      },
    },
  });

  const ranking = advisors
    .map((a) => {
      const convertedTotal = a.referrals.length;
      const commissionThisMonth = a.referrals
        .filter((r) => r.updatedAt >= monthStart && r.lessioCommission != null)
        .reduce((sum, r) => sum + (r.lessioCommission ?? 0), 0);
      return {
        advisorId: a.id,
        advisorName: a.name,
        commissionThisMonth,
        convertedTotal,
      };
    })
    .sort((a, b) => b.commissionThisMonth - a.commissionThisMonth || b.convertedTotal - a.convertedTotal);

  return NextResponse.json({ ranking, monthStart });
}
