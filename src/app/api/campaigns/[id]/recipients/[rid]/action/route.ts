import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { trackProductEvent } from "@/lib/track";

// WhatsApp ASSISTED: el asesor pulsó "Enviar por WhatsApp" para un recipient.
// Registra una ACCIÓN de envío (no entrega, no lectura). Marca contacted +
// dispara portal_link_sent (channel whatsapp) con atribución de campaña. Valida
// ownership: el recipient debe ser de ESTE asesor y de ESTA campaña.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; rid: string }> }) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, rid } = await params;

  const recipient = await db.campaignRecipient.findFirst({
    where: { id: rid, campaignId: id, advisorId: session.advisorId },
  });
  if (!recipient) return NextResponse.json({ error: "Recipient no encontrado" }, { status: 404 });

  // Idempotente: si ya se marcó contactado, no dispares otro evento.
  if (recipient.status !== "contacted") {
    await db.campaignRecipient.update({
      where: { id: rid },
      data: { status: "contacted", contactedAt: new Date(), channel: "whatsapp" },
    });
    await trackProductEvent("portal_link_sent", {
      advisorId: session.advisorId,
      clientId: recipient.clientId,
      channel: "whatsapp",
      campaignId: id,
      campaignRecipientId: rid,
    });
  }

  return NextResponse.json({ ok: true });
}
