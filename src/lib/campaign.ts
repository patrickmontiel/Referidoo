import { db } from "./db";

// Helpers server-side de Portfolio Activation Campaigns (ver 08-PORTFOLIO-CAMPAIGNS.md).
// La atribución SIEMPRE se deriva/valida aquí desde el ID opaco del recipient (?cr=),
// nunca desde un campaignId enviado por el browser.

export type CampaignAttribution = { campaignId: string; campaignRecipientId: string };

// Resuelve el ID opaco `cr` a la atribución de campaña, PERO solo si el recipient
// pertenece al `clientId` ya resuelto por el servidor (token del portal o
// referralCode). Si no coincide (otro cliente / otro asesor / inexistente),
// devuelve null → el evento se registra SIN campaña (nunca atribución cruzada).
// Best-effort: nunca lanza.
export async function resolveCampaignAttribution(
  cr: string | undefined | null,
  clientId: string
): Promise<CampaignAttribution | null> {
  if (!cr || typeof cr !== "string") return null;
  try {
    const recipient = await db.campaignRecipient.findUnique({
      where: { id: cr },
      select: { id: true, campaignId: true, clientId: true },
    });
    if (!recipient) return null;
    if (recipient.clientId !== clientId) return null; // no cross-attribution
    return { campaignId: recipient.campaignId, campaignRecipientId: recipient.id };
  } catch {
    return null;
  }
}

// Crea una campaña + sus recipients a partir de una lista de clientIds del asesor.
// Valida ownership (solo clientes del asesor), deduplica y respeta el unique
// (campaignId, clientId). Devuelve el id de la campaña y el conteo de recipients.
export async function createCampaign(params: {
  advisorId: string;
  name: string;
  messageTemplate: string;
  channel: "email" | "whatsapp";
  clientIds: string[];
}): Promise<{ campaignId: string; recipients: number; skipped: number }> {
  const { advisorId, name, messageTemplate, channel } = params;
  const requested = [...new Set(params.clientIds)];

  // Solo clientes que EXISTEN y son de este asesor (ownership server-side).
  const owned = await db.client.findMany({
    where: { id: { in: requested }, advisorId, active: true },
    select: { id: true },
  });
  const ownedIds = owned.map((c) => c.id);
  const skipped = requested.length - ownedIds.length;

  const campaign = await db.referralCampaign.create({
    data: { advisorId, name, messageTemplate, channel, status: "draft" },
    select: { id: true },
  });

  if (ownedIds.length > 0) {
    await db.campaignRecipient.createMany({
      data: ownedIds.map((clientId) => ({ campaignId: campaign.id, clientId, advisorId })),
    });
  }

  return { campaignId: campaign.id, recipients: ownedIds.length, skipped };
}
