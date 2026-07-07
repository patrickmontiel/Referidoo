import { redirect } from "next/navigation";
import { getAdvisorSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isBlobConfigured } from "@/lib/blob";
import { DEFAULT_BUBBLE_AUTO_POINTS, DEFAULT_BUBBLE_GMM_POINTS } from "@/lib/rewards";
import ReferidosClient from "./ReferidosClient";

export default async function ReferidosPage() {
  const session = await getAdvisorSession();
  if (!session) redirect("/login");

  const [referrals, advisor, settings, tiers] = await Promise.all([
    db.referral.findMany({
      where: { advisorId: session.advisorId },
      include: {
        referrer: { select: { id: true, name: true, referralCode: true, createdAt: true, launchBonusUsed: true, bubblePoints: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.advisor.findUnique({
      where: { id: session.advisorId },
      select: { plan: true },
    }),
    db.advisorSettings.findUnique({ where: { advisorId: session.advisorId } }),
    db.rewardTier.findMany({ where: { advisorId: session.advisorId }, orderBy: { position: "asc" }, select: { position: true, amount: true } }),
  ]);

  const firstTierAmount = tiers.find((t) => t.position === 1)?.amount ?? 1500;

  const serializedReferrals = referrals.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    billedAt: r.billedAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString(),
    rewardPaidAt: r.rewardPaidAt?.toISOString() ?? null,
    referrerConfirmedAt: r.referrerConfirmedAt?.toISOString() ?? null,
    referrer: {
      ...r.referrer,
      createdAt: r.referrer.createdAt.toISOString(),
    },
  }));

  return (
    <ReferidosClient
      initialReferrals={serializedReferrals}
      initialPlan={(advisor?.plan as "freemium" | "paid") ?? "freemium"}
      initialBubbleAutoPoints={settings?.bubbleAutoPoints ?? DEFAULT_BUBBLE_AUTO_POINTS}
      initialBubbleGmmPoints={settings?.bubbleGmmPoints ?? DEFAULT_BUBBLE_GMM_POINTS}
      initialFirstTierAmount={firstTierAmount}
      initialCaratulaRequired={isBlobConfigured()}
    />
  );
}
