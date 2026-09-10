import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { sendCampaignEmail } from "@/lib/email";
import { renderMessage } from "@/lib/message-templates";
import { trackProductEvent } from "@/lib/track";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://referidoo.com";
const EMAIL_BATCH = 100;

// Ejecuta la campaña.
//  - email: envío automático REAL vía Resend, idempotente (solo recipients
//    pending), marca contacted solo si Resend responde ok.
//  - whatsapp: NO auto-envía. Devuelve la cola de wa.me prellenados; cada
//    recipient se marca contactado cuando el asesor pulsa (endpoint /action).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const campaign = await db.referralCampaign.findFirst({ where: { id, advisorId: session.advisorId } });
  if (!campaign) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const advisor = await db.advisor.findUnique({
    where: { id: session.advisorId },
    select: { name: true, phone: true },
  });
  const advisorName = advisor?.name ?? "tu asesor";

  const pending = await db.campaignRecipient.findMany({
    where: { campaignId: id, status: "pending" },
    orderBy: { createdAt: "asc" },
  });
  const clientIds = pending.map((r) => r.clientId);
  const clients = await db.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true, email: true, phone: true, accessToken: true },
  });
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const portalUrl = (accessToken: string, recipientId: string) =>
    `${BASE_URL}/c/${accessToken}?cr=${recipientId}`;

  // ── WhatsApp assisted: devuelve la cola prellenada (no auto-envía) ──
  if (campaign.channel === "whatsapp") {
    if (!campaign.startedAt) {
      await db.referralCampaign.update({ where: { id }, data: { status: "sending", startedAt: new Date() } });
    }
    const queue = pending
      .map((r) => {
        const c = clientById.get(r.clientId);
        if (!c) return null;
        const url = portalUrl(c.accessToken, r.id);
        const text = renderMessage(campaign.messageTemplate, { nombre: c.name.split(" ")[0], link: url, asesor: advisorName });
        const digits = (c.phone ?? "").replace(/\D/g, "");
        const wa = digits ? `https://wa.me/${digits.length === 10 ? "52" + digits : digits}?text=${encodeURIComponent(text)}` : null;
        return { recipientId: r.id, clientName: c.name, hasPhone: !!digits, waUrl: wa, portalUrl: url };
      })
      .filter(Boolean);
    return NextResponse.json({ mode: "whatsapp_assisted", queue });
  }

  // ── Email: envío automático real (idempotente, secuencial, tope por lote) ──
  const batch = pending.slice(0, EMAIL_BATCH);
  const remaining = pending.length - batch.length;
  let sent = 0;
  let failed = 0;
  let noEmail = 0;

  if (!campaign.startedAt) {
    await db.referralCampaign.update({ where: { id }, data: { status: "sending", startedAt: new Date() } });
  }

  for (const r of batch) {
    const c = clientById.get(r.clientId);
    if (!c || !c.email) {
      noEmail++;
      await db.campaignRecipient.update({ where: { id: r.id }, data: { status: "failed", error: "sin correo", channel: "email" } }).catch(() => {});
      continue;
    }
    const url = portalUrl(c.accessToken, r.id);
    const rendered = renderMessage(campaign.messageTemplate, { nombre: c.name.split(" ")[0], link: url, asesor: advisorName });
    try {
      const res = await sendCampaignEmail({
        clientName: c.name,
        clientEmail: c.email,
        portalUrl: url,
        renderedMessage: rendered,
        subject: `${c.name.split(" ")[0]}, tu link para ganar premios`,
      });
      if (res.ok) {
        sent++;
        await db.campaignRecipient.update({ where: { id: r.id }, data: { status: "contacted", contactedAt: new Date(), channel: "email" } });
        // NO marcar enviado si Resend falla: portal_link_sent solo tras ok.
        await trackProductEvent("portal_link_sent", {
          advisorId: session.advisorId,
          clientId: c.id,
          channel: "email",
          campaignId: id,
          campaignRecipientId: r.id,
        });
      } else {
        failed++;
        await db.campaignRecipient.update({ where: { id: r.id }, data: { status: "failed", error: "Resend rechazó", channel: "email" } }).catch(() => {});
      }
    } catch (err) {
      failed++;
      await db.campaignRecipient.update({ where: { id: r.id }, data: { status: "failed", error: (err as Error).message?.slice(0, 200) ?? "error", channel: "email" } }).catch(() => {});
    }
  }

  if (remaining === 0) {
    await db.referralCampaign.update({ where: { id }, data: { status: "sent", completedAt: new Date() } });
  }

  return NextResponse.json({ mode: "email", sent, failed, noEmail, remaining });
}
