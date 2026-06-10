import { NextRequest, NextResponse } from "next/server";
import { sendPaymentSentNotification, type PaymentPayload } from "@/lib/email";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await req.json()) as PaymentPayload;
  if (!payload.referrerEmail) {
    return NextResponse.json({ error: "No email" }, { status: 400 });
  }

  await sendPaymentSentNotification(payload).catch(console.error);
  return NextResponse.json({ ok: true });
}
