import { db } from "./db";

export type RewardTier = {
  position: number;
  amount: number;
  label: string | null;
};

export async function getAdvisorTiers(advisorId: string): Promise<RewardTier[]> {
  return db.rewardTier.findMany({
    where: { advisorId },
    orderBy: { position: "asc" },
  });
}

export async function calculateRewardForNextReferral(
  advisorId: string,
  completedReferrals: number
): Promise<{ amount: number; tierPosition: number }> {
  const tiers = await getAdvisorTiers(advisorId);
  const settings = await db.advisorSettings.findUnique({ where: { advisorId } });

  const nextPosition = completedReferrals + 1;

  if (tiers.length === 0) {
    return { amount: 1500, tierPosition: nextPosition };
  }

  const exactTier = tiers.find((t) => t.position === nextPosition);
  if (exactTier) {
    return { amount: exactTier.amount, tierPosition: nextPosition };
  }

  const mode = settings?.afterLastTier ?? "cycle";

  if (mode === "cycle") {
    const cyclePos = ((nextPosition - 1) % tiers.length) + 1;
    const cycleTier = tiers.find((t) => t.position === cyclePos);
    return { amount: cycleTier?.amount ?? tiers[0].amount, tierPosition: nextPosition };
  }

  if (mode === "flat") {
    return { amount: settings?.flatAmount ?? 1500, tierPosition: nextPosition };
  }

  // "stop" — return last tier
  const lastTier = tiers[tiers.length - 1];
  return { amount: lastTier.amount, tierPosition: nextPosition };
}

export function getProgressSummary(
  tiers: RewardTier[],
  completedCount: number,
  afterLastTier: string,
  flatAmount: number
) {
  if (tiers.length === 0) return null;

  const nextPosition = completedCount + 1;
  const exactTier = tiers.find((t) => t.position === nextPosition);

  if (exactTier) {
    return { nextAmount: exactTier.amount, nextPosition };
  }

  if (afterLastTier === "cycle") {
    const cyclePos = ((nextPosition - 1) % tiers.length) + 1;
    const cycleTier = tiers.find((t) => t.position === cyclePos);
    return { nextAmount: cycleTier?.amount ?? tiers[0].amount, nextPosition };
  }

  if (afterLastTier === "flat") {
    return { nextAmount: flatAmount, nextPosition };
  }

  return null;
}
