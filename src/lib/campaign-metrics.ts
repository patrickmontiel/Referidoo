// Métricas de Portfolio Activation Campaign — funciones PURAS (testeables sin DB).
// Ver 08-PORTFOLIO-CAMPAIGNS.md. Reglas de honestidad:
//  - opens / shares / productive referrers = ÚNICOS por recipient.
//  - landing views / form starts = conteos brutos (una vista NO es una persona única).
//  - Las tasas usan "contacted" como denominador; ÷0 → null (no se inventa 0%/100%).

export type RecipientLite = { id: string; status: string };
export type CampaignEventLite = { event: string; campaignRecipientId: string | null };

export type CampaignMetrics = {
  audience: number;
  contacted: number; // email: enviados OK · whatsapp: acciones de envío
  opens: number; // recipients únicos con client_portal_opened
  shares: number; // recipients únicos con referral_share_clicked
  landingViews: number; // conteo bruto de vistas
  formStarts: number; // conteo bruto
  referrals: number; // referral_created de la campaña
  productiveReferrers: number; // recipients únicos con ≥1 referral_created
  productiveReferrerRate: number | null; // productiveReferrers / contacted
  leadYield: number | null; // referrals / contacted
  referralMultiplier: number | null; // referrals / productiveReferrers
};

function uniqueRecipients(events: CampaignEventLite[], event: string): number {
  const set = new Set<string>();
  for (const e of events) if (e.event === event && e.campaignRecipientId) set.add(e.campaignRecipientId);
  return set.size;
}

function count(events: CampaignEventLite[], event: string): number {
  let n = 0;
  for (const e of events) if (e.event === event) n++;
  return n;
}

const ratio = (num: number, den: number): number | null => (den > 0 ? num / den : null);

export function computeCampaignMetrics(
  recipients: RecipientLite[],
  events: CampaignEventLite[]
): CampaignMetrics {
  const audience = recipients.length;
  const contacted = recipients.filter((r) => r.status === "contacted").length;
  const opens = uniqueRecipients(events, "client_portal_opened");
  const shares = uniqueRecipients(events, "referral_share_clicked");
  const landingViews = count(events, "referral_landing_viewed");
  const formStarts = count(events, "referral_form_started");
  const referrals = count(events, "referral_created");
  const productiveReferrers = uniqueRecipients(events, "referral_created");

  return {
    audience,
    contacted,
    opens,
    shares,
    landingViews,
    formStarts,
    referrals,
    productiveReferrers,
    productiveReferrerRate: ratio(productiveReferrers, contacted),
    leadYield: ratio(referrals, contacted),
    referralMultiplier: productiveReferrers > 0 ? referrals / productiveReferrers : null,
  };
}

export type RecipientRollup = {
  recipientId: string;
  contacted: boolean;
  opened: boolean;
  shared: boolean;
  referrals: number;
};

// Rollup por recipient para el drilldown (Ana: action ✅ open ✅ share ✅ 3 referrals).
export function perRecipientRollup(
  recipients: (RecipientLite & { id: string })[],
  events: CampaignEventLite[]
): Map<string, RecipientRollup> {
  const byRecipient = new Map<string, RecipientRollup>();
  for (const r of recipients) {
    byRecipient.set(r.id, { recipientId: r.id, contacted: r.status === "contacted", opened: false, shared: false, referrals: 0 });
  }
  for (const e of events) {
    if (!e.campaignRecipientId) continue;
    const row = byRecipient.get(e.campaignRecipientId);
    if (!row) continue;
    if (e.event === "client_portal_opened") row.opened = true;
    else if (e.event === "referral_share_clicked") row.shared = true;
    else if (e.event === "referral_created") row.referrals += 1;
  }
  return byRecipient;
}
