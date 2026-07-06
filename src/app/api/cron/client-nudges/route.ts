import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendBubbleReadyReminder, sendMonthlyProgressEmail } from "@/lib/email";
import { calculateRewardForNextReferral } from "@/lib/rewards";

// Recordatorios a los clientes de los asesores. Dos modos, dos cadencias:
//   ?mode=ready  (semanal)  — "tienes un premio listo" solo a quien tiene
//                             burbuja reclamable y ningún reclamo pendiente.
//   ?mode=digest (mensual)  — "así va tu progreso" a clientes activos con
//                             correo y alguna actividad (puntos o referidos).
// La frecuencia la limita el propio cron (sin estado extra en la base).
// APAGADO por default: se activa poniendo CLIENT_NUDGES_ENABLED=true en
// Vercel — así los correos existen hoy y se encienden cuando decidamos.
const DEFAULT_THRESHOLD = 500;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.CLIENT_NUDGES_ENABLED !== "true") {
    return NextResponse.json({ skipped: "CLIENT_NUDGES_ENABLED != true" });
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "ready";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://referidoo.com";

  const [clients, settingsList] = await Promise.all([
    db.client.findMany({
      where: { active: true, email: { not: null }, advisor: { deletedAt: null } },
      select: {
        id: true,
        name: true,
        email: true,
        accessToken: true,
        bubblePoints: true,
        advisorId: true,
        advisor: { select: { name: true } },
      },
    }),
    db.advisorSettings.findMany({ select: { advisorId: true, bubbleClaimThreshold: true } }),
  ]);
  const thresholdByAdvisor = new Map(settingsList.map((s) => [s.advisorId, s.bubbleClaimThreshold]));

  let sent = 0;

  if (mode === "ready") {
    const pendingClaims = await db.bubbleClaim.findMany({
      where: { status: "pending" },
      select: { clientId: true },
    });
    const pendingSet = new Set(pendingClaims.map((c) => c.clientId));

    for (const c of clients) {
      const threshold = thresholdByAdvisor.get(c.advisorId) ?? DEFAULT_THRESHOLD;
      if (c.bubblePoints < threshold || pendingSet.has(c.id)) continue;
      const claimable = Math.floor(c.bubblePoints / threshold) * threshold;
      await sendBubbleReadyReminder({
        referrerName: c.name,
        referrerEmail: c.email!,
        amount: claimable,
        portalUrl: `${baseUrl}/c/${c.accessToken}`,
        advisorName: c.advisor.name,
      });
      sent++;
    }
  } else if (mode === "digest") {
    for (const c of clients) {
      const completedCount = await db.referral.count({
        where: { referrerId: c.id, status: { not: "rejected" } },
      });
      // Sin actividad no hay nada que resumir — no molestamos.
      if (c.bubblePoints === 0 && completedCount === 0) continue;

      const threshold = thresholdByAdvisor.get(c.advisorId) ?? DEFAULT_THRESHOLD;
      const { amount, tierPosition } = await calculateRewardForNextReferral(c.advisorId, completedCount);
      await sendMonthlyProgressEmail({
        referrerName: c.name,
        referrerEmail: c.email!,
        advisorName: c.advisor.name,
        portalUrl: `${baseUrl}/c/${c.accessToken}`,
        bubblePoints: c.bubblePoints,
        bubbleThreshold: threshold,
        nextTierPosition: tierPosition > 0 ? tierPosition : null,
        nextTierAmount: amount > 0 ? amount : null,
      });
      sent++;
    }
  } else {
    return NextResponse.json({ error: `mode desconocido: ${mode}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true, mode, sent, clientsConsidered: clients.length });
}
