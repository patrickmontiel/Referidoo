import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendBubbleClaimNotification } from "@/lib/email";
import { getAdvisorBubbleSettings } from "@/lib/rewards";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const client = await db.client.findUnique({
    where: { accessToken: token },
    include: { advisor: { select: { name: true, email: true } } },
  });
  if (!client) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const bubbleSettings = await getAdvisorBubbleSettings(client.advisorId);
  const points = client.bubblePoints;
  if (points < bubbleSettings.claimThreshold) {
    return NextResponse.json({ error: "Aún no alcanzas el mínimo para reclamar" }, { status: 400 });
  }

  const claim = await db.bubbleClaim.create({
    data: { clientId: client.id, amount: points },
  });

  await db.client.update({ where: { id: client.id }, data: { bubblePoints: 0 } });

  sendBubbleClaimNotification({
    referrerName: client.name,
    referrerEmail: client.email,
    advisorName: client.advisor.name,
    advisorEmail: client.advisor.email,
    amount: points,
  }).catch((err) => console.error("[email] Error enviando reclamo de burbuja:", err));

  return NextResponse.json({ ok: true, claim });
}
