import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { sendBubbleClaimPaidNotification } from "@/lib/email";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const claim = await db.bubbleClaim.findUnique({
    where: { id },
    include: { client: { include: { advisor: { select: { name: true, email: true } } } } },
  });
  if (!claim || claim.client.advisorId !== session.advisorId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const newStatus = body.status ?? claim.status;
  const isPaid = newStatus === "paid" && claim.status !== "paid";

  const updated = await db.bubbleClaim.update({
    where: { id },
    data: {
      status: newStatus,
      paymentNote: body.paymentNote ?? claim.paymentNote,
      ...(isPaid ? { paidAt: new Date() } : {}),
    },
  });

  if (isPaid) {
    sendBubbleClaimPaidNotification({
      referrerName: claim.client.name,
      referrerEmail: claim.client.email,
      advisorName: claim.client.advisor.name,
      advisorEmail: claim.client.advisor.email,
      amount: claim.amount,
      paymentNote: body.paymentNote ?? null,
    }).catch((err) => console.error("[email] Error enviando pago de burbuja:", err));
  }

  return NextResponse.json(updated);
}
