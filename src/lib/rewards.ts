import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./db";

// Tiers y settings del asesor cambian solo cuando edita /admin/niveles o
// /admin/burbuja, pero se leen en cada referido creado/convertido (incluyendo
// los dos endpoints públicos sin auth). Cachear esto evita 2 queries por
// llamada en el hot path más usado de toda la app.
const ADVISOR_CONFIG_REVALIDATE_SECONDS = 60;

function advisorConfigTag(advisorId: string) {
  return `advisor-config-${advisorId}`;
}

const getCachedAdvisorSettings = (advisorId: string) =>
  unstable_cache(
    async () => db.advisorSettings.findUnique({ where: { advisorId } }),
    ["advisor-settings", advisorId],
    { tags: [advisorConfigTag(advisorId)], revalidate: ADVISOR_CONFIG_REVALIDATE_SECONDS }
  )();

const getCachedAdvisorTiers = (advisorId: string) =>
  unstable_cache(
    async () =>
      db.rewardTier.findMany({ where: { advisorId }, orderBy: { position: "asc" } }),
    ["advisor-tiers", advisorId],
    { tags: [advisorConfigTag(advisorId)], revalidate: ADVISOR_CONFIG_REVALIDATE_SECONDS }
  )();

// Llamar después de escribir en /api/tiers o /api/bubble-settings para que el
// cambio se vea de inmediato en vez de esperar el TTL de 60s.
export function invalidateAdvisorConfigCache(advisorId: string) {
  revalidateTag(advisorConfigTag(advisorId), { expire: 0 });
}

// Comisión de Lessio sobre el valor del plan/prima, pagada una sola vez (primer
// año). Freemium paga casi el doble que pagado — no es solo el tope de 2
// clientes lo que empuja el upgrade, también el costo por conversión baja al
// pagar. Decidido en /office-hours 2026-06-29, ver
// ~/.gstack/projects/patrickmontiel-Referidoo/patri-master-design-20260629-013637.md
const LESSIO_COMMISSION_RATES: Record<string, { freemium: number; paid: number }> = {
  PPR: { freemium: 0.0025, paid: 0.0015 },
  Vida: { freemium: 0.0025, paid: 0.0015 },
  "Daños/Auto": { freemium: 0.0015, paid: 0.0008 },
  GMM: { freemium: 0.0015, paid: 0.0008 },
};

export function calculateLessioCommission(
  productType: string | null | undefined,
  saleAmount: number | null | undefined,
  plan: string | null | undefined
): number | null {
  if (!productType || !saleAmount) return null;
  const rates = LESSIO_COMMISSION_RATES[productType];
  if (!rates) return null;
  const rate = plan === "paid" ? rates.paid : rates.freemium;
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
  const settings = await getCachedAdvisorSettings(advisorId);
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
  return getCachedAdvisorTiers(advisorId);
}

export type AdvisorTierSettings = { afterLastTier: string; flatAmount: number } | null;

export async function getAdvisorSettings(advisorId: string): Promise<AdvisorTierSettings> {
  return getCachedAdvisorSettings(advisorId);
}

// Lógica pura de asignación de nivel/premio — separada de la carga de datos
// para que llamadores con un loop (p. ej. recalculate-rewards) puedan pedir
// tiers/settings una sola vez en vez de una vez por referido.
export function computeRewardForPosition(
  tiers: RewardTier[],
  settings: AdvisorTierSettings,
  completedReferrals: number
): { amount: number; tierPosition: number } {
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

export async function calculateRewardForNextReferral(
  advisorId: string,
  completedReferrals: number
): Promise<{ amount: number; tierPosition: number }> {
  const [tiers, settings] = await Promise.all([
    getCachedAdvisorTiers(advisorId),
    getCachedAdvisorSettings(advisorId),
  ]);
  return computeRewardForPosition(tiers, settings, completedReferrals);
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
