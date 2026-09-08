// Agregación pura del funnel de activación (sin DB) para poder testearla.
// La usa /owner/activacion. Los pasos deben ir en orden del funnel.

export const FUNNEL_STEP_KEYS = [
  "client_created",
  "portal_link_sent",
  "client_portal_opened",
  "referral_share_clicked",
  "referral_landing_viewed",
  "referral_form_started",
  "referral_created",
] as const;

export type FunnelStepKey = (typeof FUNNEL_STEP_KEYS)[number];

export function emptyCounts(): Record<string, number> {
  const r: Record<string, number> = {};
  for (const k of FUNNEL_STEP_KEYS) r[k] = 0;
  return r;
}

// Conteo global por paso.
export function aggregateFunnel(events: { event: string }[]): Record<string, number> {
  const agg = emptyCounts();
  for (const e of events) if (e.event in agg) agg[e.event]++;
  return agg;
}

// Conteo por asesor (ignora eventos sin advisorId).
export function perAdvisorFunnel(
  events: { event: string; advisorId: string | null }[]
): Map<string, Record<string, number>> {
  const per = new Map<string, Record<string, number>>();
  for (const e of events) {
    if (!e.advisorId) continue;
    let row = per.get(e.advisorId);
    if (!row) { row = emptyCounts(); per.set(e.advisorId, row); }
    if (e.event in row) row[e.event]++;
  }
  return per;
}
