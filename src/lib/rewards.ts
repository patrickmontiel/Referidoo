import { db } from "./db";

// Comisión de Lessio sobre el valor del plan/prima, pagada una sola vez (primer año)
const LESSIO_COMMISSION_RATES: Record<string, number> = {
  PPR: 0.0015,
  Vida: 0.0015,
  "Daños/Auto": 0.0008,
  GMM: 0.0008,
};

export function calculateLessioCommission(
  productType: string | null | undefined,
  saleAmount: number | null | undefined
): number | null {
  if (!productType || !saleAmount) return null;
  const rate = LESSIO_COMMISSION_RATES[productType];
  if (!rate) return null;
  return Math.round(saleAmount * rate);
}

// Premios burbuja: Auto + GMM acumulan a un mismo fondo, reclamable al superar el umbral
export const DEFAULT_BUBBLE_AUTO_POINTS = 150;
export const DEFAULT_BUBBLE_GMM_POINTS = 300;
export const DEFAULT_BUBBLE_CLAIM_THRESHOLD = 500;

export type BubbleSettings = {
  autoPoints: number;
  gmmPoints: number;
  claimThreshold: number;
};

export async function getAdvisorBubbleSettings(advisorId: string): Promise<BubbleSettings> {
  const settings = await db.advisorSettings.findUnique({ where: { advisorId } });
  return {
    autoPoints: settings?.bubbleAutoPoints ?? DEFAULT_BUBBLE_AUTO_POINTS,
    gmmPoints: settings?.bubbleGmmPoints ?? DEFAULT_BUBBLE_GMM_POINTS,
    claimThreshold: settings?.bubbleClaimThreshold ?? DEFAULT_BUBBLE_CLAIM_THRESHOLD,
  };
}

export function getBubblePointsForProduct(
  productType: string | null | undefined,
  settings: BubbleSettings
): number | undefined {
  // "Otro" usa la misma escala que Daños/Auto
  if (productType === "Daños/Auto" || productType === "Otro") return settings.autoPoints;
  if (productType === "GMM") return settings.gmmPoints;
  return undefined;
}

// Solo Vida/PPR (o sin producto especificado) avanzan en la escalera de premios
// (1,500/1,500/2,500). Daños/Auto, GMM y Otro van a premios burbuja en vez de
// la escalera.
export const ESCALERA_PRODUCTS = ["Vida", "PPR"];
const NON_ESCALERA_PRODUCTS = ["Daños/Auto", "GMM", "Otro"];

export function isEscaleraProduct(productType: string | null | undefined): boolean {
  return !productType || !NON_ESCALERA_PRODUCTS.includes(productType);
}

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
