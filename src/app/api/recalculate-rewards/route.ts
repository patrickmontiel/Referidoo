import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { calculateRewardForNextReferral } from "@/lib/rewards";

// Endpoint de un solo uso: recalcula tierPosition/rewardAmount de los referidos
// ya convertidos, ordenados por orden de CONVERSIÓN (createdAt asc entre los
// "converted"), no por orden de registro del lead. Preserva el bono de
// lanzamiento (+$1000) en el que quede en tierPosition 1 si el cliente ya lo usó.
export async function POST() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const clients = await db.client.findMany({
    where: { advisorId: session.advisorId },
    include: {
      referrals: {
        where: { status: "converted" },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const updates: Array<{
    referralId: string;
    leadName: string;
    clientName: string;
    before: { tierPosition: number; rewardAmount: number };
    after: { tierPosition: number; rewardAmount: number };
  }> = [];

  for (const client of clients) {
    for (let i = 0; i < client.referrals.length; i++) {
      const referral = client.referrals[i];
      const { amount, tierPosition } = await calculateRewardForNextReferral(session.advisorId, i);
      const rewardAmount = tierPosition === 1 && client.launchBonusUsed ? amount + 1000 : amount;

      if (tierPosition !== referral.tierPosition || rewardAmount !== referral.rewardAmount) {
        await db.referral.update({
          where: { id: referral.id },
          data: { tierPosition, rewardAmount },
        });
        updates.push({
          referralId: referral.id,
          leadName: referral.leadName,
          clientName: client.name,
          before: { tierPosition: referral.tierPosition, rewardAmount: referral.rewardAmount },
          after: { tierPosition, rewardAmount },
        });
      }
    }
  }

  return NextResponse.json({ ok: true, updates });
}
