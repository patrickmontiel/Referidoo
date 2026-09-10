import { describe, it, expect } from "vitest";
import { computeCampaignMetrics, perRecipientRollup, type RecipientLite, type CampaignEventLite } from "@/lib/campaign-metrics";

function recipients(n: number, status = "contacted"): RecipientLite[] {
  return Array.from({ length: n }, (_, i) => ({ id: `r${i + 1}`, status }));
}

describe("computeCampaignMetrics", () => {
  it("ejemplo del brief: 40 contactados, 5 productive referrers, 11 referidos", () => {
    const recs = recipients(40);
    // 11 referral_created repartidos entre 5 recipients (r1..r5).
    const dist = [3, 3, 2, 2, 1]; // suma 11
    const events: CampaignEventLite[] = [];
    dist.forEach((count, idx) => {
      for (let k = 0; k < count; k++) events.push({ event: "referral_created", campaignRecipientId: `r${idx + 1}` });
    });
    const m = computeCampaignMetrics(recs, events);
    expect(m.audience).toBe(40);
    expect(m.contacted).toBe(40);
    expect(m.referrals).toBe(11);
    expect(m.productiveReferrers).toBe(5);
    expect(m.productiveReferrerRate).toBeCloseTo(0.125, 5); // 12.5%
    expect(m.leadYield).toBeCloseTo(0.275, 5); // 27.5 por 100
    expect(m.referralMultiplier).toBeCloseTo(2.2, 5);
  });

  it("opens/shares/productive son ÚNICOS por recipient; landing/form son conteos brutos", () => {
    const recs = recipients(3);
    const events: CampaignEventLite[] = [
      { event: "client_portal_opened", campaignRecipientId: "r1" },
      { event: "client_portal_opened", campaignRecipientId: "r1" }, // repetido → 1 open único
      { event: "referral_share_clicked", campaignRecipientId: "r1" },
      { event: "referral_landing_viewed", campaignRecipientId: "r1" },
      { event: "referral_landing_viewed", campaignRecipientId: "r1" }, // 2 vistas (brutas)
      { event: "referral_form_started", campaignRecipientId: "r1" },
    ];
    const m = computeCampaignMetrics(recs, events);
    expect(m.opens).toBe(1);
    expect(m.shares).toBe(1);
    expect(m.landingViews).toBe(2); // bruto, NO único
    expect(m.formStarts).toBe(1);
  });

  it("con 0 contactados las tasas son null (no inventa 0%/100%)", () => {
    const m = computeCampaignMetrics(recipients(5, "pending"), []);
    expect(m.contacted).toBe(0);
    expect(m.productiveReferrerRate).toBeNull();
    expect(m.leadYield).toBeNull();
    expect(m.referralMultiplier).toBeNull(); // 0 productive referrers
  });

  it("ignora eventos sin campaignRecipientId para conteos únicos", () => {
    const recs = recipients(2);
    const events: CampaignEventLite[] = [
      { event: "client_portal_opened", campaignRecipientId: null },
      { event: "referral_created", campaignRecipientId: "r1" },
    ];
    const m = computeCampaignMetrics(recs, events);
    expect(m.opens).toBe(0);
    expect(m.productiveReferrers).toBe(1);
  });
});

describe("perRecipientRollup", () => {
  it("arma el drilldown por recipient (Ana action/open/share/refs)", () => {
    const recs = [{ id: "ana", status: "contacted" }, { id: "luis", status: "contacted" }];
    const events: CampaignEventLite[] = [
      { event: "client_portal_opened", campaignRecipientId: "ana" },
      { event: "referral_share_clicked", campaignRecipientId: "ana" },
      { event: "referral_created", campaignRecipientId: "ana" },
      { event: "referral_created", campaignRecipientId: "ana" },
      { event: "referral_created", campaignRecipientId: "ana" },
      { event: "client_portal_opened", campaignRecipientId: "luis" },
    ];
    const roll = perRecipientRollup(recs, events);
    expect(roll.get("ana")).toEqual({ recipientId: "ana", contacted: true, opened: true, shared: true, referrals: 3 });
    expect(roll.get("luis")).toEqual({ recipientId: "luis", contacted: true, opened: true, shared: false, referrals: 0 });
  });
});
