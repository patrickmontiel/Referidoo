import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { computeCampaignMetrics, perRecipientRollup } from "@/lib/campaign-metrics";
import { renderMessage } from "@/lib/message-templates";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://referidoo.com";

// Detalle + métricas de una campaña del asesor. Valida ownership.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const campaign = await db.referralCampaign.findFirst({
    where: { id, advisorId: session.advisorId },
  });
  if (!campaign) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const [recipients, events] = await Promise.all([
    db.campaignRecipient.findMany({ where: { campaignId: id }, orderBy: { createdAt: "asc" } }),
    db.productEvent.findMany({
      where: { campaignId: id },
      select: { event: true, campaignRecipientId: true },
    }),
  ]);

  // Nombres de cliente para el drilldown (cartera propia del asesor).
  const clientIds = recipients.map((r) => r.clientId);
  const clients = await db.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true, email: true, phone: true, accessToken: true },
  });
  const nameById = new Map(clients.map((c) => [c.id, c.name]));
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const metrics = computeCampaignMetrics(recipients, events);
  const rollup = perRecipientRollup(recipients, events);

  const recipientRows = recipients.map((r) => {
    const roll = rollup.get(r.id)!;
    return {
      recipientId: r.id,
      clientName: nameById.get(r.clientId) ?? "—",
      status: r.status,
      channel: r.channel,
      error: r.error,
      contacted: roll.contacted,
      opened: roll.opened,
      shared: roll.shared,
      referrals: roll.referrals,
    };
  });

  // WhatsApp assisted: cola de wa.me prellenados (read-only; el evento se
  // registra en el endpoint /action cuando el asesor pulsa). Solo pendientes.
  let whatsappQueue: { recipientId: string; clientName: string; waUrl: string | null; portalUrl: string }[] | undefined;
  if (campaign.channel === "whatsapp") {
    const advisor = await db.advisor.findUnique({ where: { id: session.advisorId }, select: { name: true } });
    whatsappQueue = recipients
      .filter((r) => r.status !== "contacted")
      .map((r) => {
        const c = clientById.get(r.clientId);
        if (!c) return null;
        const url = `${BASE_URL}/c/${c.accessToken}?cr=${r.id}`;
        const text = renderMessage(campaign.messageTemplate, { nombre: c.name.split(" ")[0], link: url, asesor: advisor?.name ?? "tu asesor" });
        const digits = (c.phone ?? "").replace(/\D/g, "");
        const wa = digits ? `https://wa.me/${digits.length === 10 ? "52" + digits : digits}?text=${encodeURIComponent(text)}` : null;
        return { recipientId: r.id, clientName: c.name, waUrl: wa, portalUrl: url };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      channel: campaign.channel,
      status: campaign.status,
      createdAt: campaign.createdAt,
    },
    metrics,
    recipients: recipientRows,
    whatsappQueue,
  });
}
