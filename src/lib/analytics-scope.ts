// DATA TRUTH — alcance único de las métricas de Owner.
//
// REGLA: ninguna query de analytics filtra por email/nombre hardcodeado.
// El aislamiento de cuentas internas (owner, QA, e2e, demos, seeds) es una
// PROPIEDAD explícita del Advisor: `analyticsExcluded`.
//
// Toda métrica de Owner DEBE reutilizar estos fragmentos. Si una query no los
// usa, está contando humo. Ver 15-METRICS-DICTIONARY.md.

/** Advisors que cuentan como negocio real: vivos y no marcados como internos. */
export const REAL_ADVISOR_WHERE = {
  deletedAt: null,
  analyticsExcluded: false,
} as const;

/**
 * Filtro para queries sobre modelos que tienen relación `advisor`
 * (Referral, Client, PlanEvent, BubbleClaim…): exige que el asesor sea real.
 */
export const REAL_ADVISOR_RELATION_WHERE = {
  advisor: REAL_ADVISOR_WHERE,
} as const;

/**
 * Referrals que cuentan: de asesor real y NO borrados.
 * `Referral.deletedAt` es soft-delete — históricamente NINGUNA query de Owner
 * lo filtraba, así que las métricas incluían referidos ya borrados.
 */
export const REAL_REFERRAL_WHERE = {
  deletedAt: null,
  ...REAL_ADVISOR_RELATION_WHERE,
} as const;

/** Clients que cuentan: activos y de asesor real. */
export const REAL_CLIENT_WHERE = {
  active: true,
  ...REAL_ADVISOR_RELATION_WHERE,
} as const;

/**
 * MRR real: solo suscripciones de Mercado Pago vivas.
 * `plan="paid"` SIN `mpPreapprovalId` es un TRIAL o un comp manual — NO es MRR.
 * (Un backfill histórico dejó muchos advisors en plan="paid" sin suscripción.)
 */
export const REAL_PAID_SUBSCRIPTION_WHERE = {
  ...REAL_ADVISOR_WHERE,
  plan: "paid",
  mpPreapprovalId: { not: null },
} as const;

/**
 * Devuelve el valor a mostrar para una tasa: `null` cuando no hay denominador.
 * NUNCA inventar 0% ni 100% cuando no hay datos — el UI muestra "Sin datos".
 */
export function safeRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}
