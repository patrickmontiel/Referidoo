import { NextResponse } from "next/server";
import {
  sendNewReferralNotification,
  sendFreemiumLimitEmail,
  sendReferralApprovedNotification,
  sendPaymentSentNotification,
  sendConfirmationRequest,
  sendReferrerConfirmedNotification,
  sendVerificationEmail,
  sendBubbleClaimNotification,
  sendBubbleClaimPaidNotification,
} from "@/lib/email";

const TEST_TO = "patrickkarim2002@gmail.com";
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://referidoo.com";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== "preview2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, string> = {};

  const run = async (name: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      results[name] = "✓";
    } catch (e) {
      results[name] = `✗ ${e instanceof Error ? e.message : String(e)}`;
    }
  };

  const referralPayload = {
    advisorName: "Carlos Méndez",
    advisorEmail: TEST_TO,
    referrerName: "Ana García",
    leadName: "Roberto Flores",
    leadPhone: "55 1234 5678",
    leadEmail: "roberto@ejemplo.com",
    rewardAmount: 800,
    tierPosition: 3,
  };

  const paymentPayload = {
    referrerName: "Ana García",
    referrerEmail: TEST_TO,
    advisorName: "Carlos Méndez",
    advisorEmail: TEST_TO,
    leadName: "Roberto Flores",
    rewardAmount: 800,
    portalUrl: `${BASE}/c/demo-token`,
    tierPosition: 3,
    nextTierPosition: 4,
    nextTierAmount: 1200,
    paymentNote: "SPEI · Ref. 20240702",
  };

  await run("1-nuevo-referido", () =>
    sendNewReferralNotification(referralPayload)
  );

  await run("2-limite-freemium", () =>
    sendFreemiumLimitEmail({
      advisorName: "Carlos Méndez",
      advisorEmail: TEST_TO,
      referrerName: "Ana García",
      leadName: "Roberto Flores",
      totalLeads: 13,
    })
  );

  await run("3-conversion-cerrada", () =>
    sendReferralApprovedNotification({
      ...referralPayload,
      saleAmount: 18000,
      productType: "Vida PPR",
      lessioCommission: 2700,
      launchBonusApplied: false,
    })
  );

  await run("4-premio-enviado", () =>
    sendPaymentSentNotification(paymentPayload)
  );

  await run("5-solicitud-confirmacion", () =>
    sendConfirmationRequest({ ...paymentPayload, nextTierPosition: null, nextTierAmount: null })
  );

  await run("6-referente-confirmo", () =>
    sendReferrerConfirmedNotification({
      referrerName: "Ana García",
      advisorName: "Carlos Méndez",
      leadName: "Roberto Flores",
      rewardAmount: 800,
      saleAmount: 18000,
    })
  );

  await run("7-verificacion-correo", () =>
    sendVerificationEmail({
      advisorEmail: TEST_TO,
      advisorName: "Carlos Méndez",
      verificationToken: "tok_demo_123abc",
    })
  );

  await run("8-burbuja-reclamada", () =>
    sendBubbleClaimNotification({
      referrerName: "Ana García",
      referrerEmail: TEST_TO,
      advisorName: "Carlos Méndez",
      advisorEmail: TEST_TO,
      amount: 1500,
    })
  );

  await run("9-burbuja-pagada", () =>
    sendBubbleClaimPaidNotification({
      referrerName: "Ana García",
      referrerEmail: TEST_TO,
      advisorName: "Carlos Méndez",
      advisorEmail: TEST_TO,
      amount: 1500,
      paymentNote: "SPEI · Ref. 20240702",
    })
  );

  return NextResponse.json({ sent_to: TEST_TO, results });
}
