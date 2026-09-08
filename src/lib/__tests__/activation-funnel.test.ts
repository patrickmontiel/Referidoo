import { describe, it, expect } from "vitest";
import { aggregateFunnel, perAdvisorFunnel } from "@/lib/activation-funnel";

const events = [
  { event: "client_created", advisorId: "a1" },
  { event: "client_created", advisorId: "a1" },
  { event: "client_portal_opened", advisorId: "a1" },
  { event: "referral_created", advisorId: "a2" },
  { event: "evento_desconocido", advisorId: "a1" }, // debe ignorarse
  { event: "client_created", advisorId: null }, // cuenta global, no por asesor
];

describe("aggregateFunnel", () => {
  it("cuenta por paso e ignora eventos desconocidos", () => {
    const agg = aggregateFunnel(events);
    expect(agg.client_created).toBe(3);
    expect(agg.client_portal_opened).toBe(1);
    expect(agg.referral_created).toBe(1);
    expect(agg.referral_form_started).toBe(0);
    expect((agg as Record<string, number>).evento_desconocido).toBeUndefined();
  });
});

describe("perAdvisorFunnel", () => {
  it("segrega por asesor e ignora eventos sin advisorId", () => {
    const per = perAdvisorFunnel(events);
    expect(per.get("a1")!.client_created).toBe(2); // el de advisorId null no cuenta aquí
    expect(per.get("a1")!.client_portal_opened).toBe(1);
    expect(per.get("a2")!.referral_created).toBe(1);
    expect(per.get("a2")!.client_created).toBe(0);
    expect(per.has("a1")).toBe(true);
  });
});
