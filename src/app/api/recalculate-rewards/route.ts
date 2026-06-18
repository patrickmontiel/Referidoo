import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { computeRewardForPosition, getAdvisorSettings, getAdvisorTiers, isEscaleraProduct } from "@/lib/rewards";

// Endpoint de un solo uso: recalcula tierPosition/rewardAmount de los referidos
// ya convertidos, ordenados por orden de CONVERSIÓN (createdAt asc entre los
// "converted"), no por orden de registro del lead. Preserva el bono de
// lanzamiento (+$1000) en el que quede en tierPosition 1 si el cliente ya lo usó.
export async function POST() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [clients, tiers, settings] = await Promise.all([
    db.client.findMany({
      where: { advisorId: session.advisorId },
      include: {
        referrals: {
          where: { status: "converted" },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    getAdvisorTiers(session.advisorId),
    getAdvisorSettings(session.advisorId),
  ]);

  const updates: Array<{
    referralId: string;
    leadName: string;
    clientName: string;
    before: { tierPosition: number; rewardAmount: number };
    after: { tierPosition: number; rewardAmount: number };
  }> = [];

  for (const client of clients) {
    // Solo Vida/PPR (escalera) avanzan en tierPosition/rewardAmount. Daños/Auto,
    // GMM y "Otro" no consumen escalones — su recompensa es vía premios burbuja.
    const escaleraReferrals = client.referrals.filter((r) => isEscaleraProduct(r.productType));
    const otherReferrals = client.referrals.filter((r) => !isEscaleraProduct(r.productType));

    for (let i = 0; i < escaleraReferrals.length; i++) {
      const referral = escaleraReferrals[i];
      const { amount, tierPosition } = computeRewardForPosition(tiers, settings, i);
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

    for (const referral of otherReferrals) {
      if (referral.tierPosition !== 0 || referral.rewardAmount !== 0) {
        await db.referral.update({
          where: { id: referral.id },
          data: { tierPosition: 0, rewardAmount: 0 },
        });
        updates.push({
          referralId: referral.id,
          leadName: referral.leadName,
          clientName: client.name,
          before: { tierPosition: referral.tierPosition, rewardAmount: referral.rewardAmount },
          after: { tierPosition: 0, rewardAmount: 0 },
        });
      }
    }
  }

  return NextResponse.json({ ok: true, updates });
}
