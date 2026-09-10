import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { createCampaign } from "@/lib/campaign";

// Portfolio Activation Campaigns. POST crea la campaña + recipients (valida
// ownership de los clientes en el servidor). GET lista las campañas del asesor
// con un resumen ligero. Ver 08-PORTFOLIO-CAMPAIGNS.md.
export async function POST(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name, channel, messageTemplate, clientIds } = await req.json();
  if (!name?.trim() || !messageTemplate?.trim()) {
    return NextResponse.json({ error: "Nombre y mensaje son obligatorios" }, { status: 400 });
  }
  if (channel !== "email" && channel !== "whatsapp") {
    return NextResponse.json({ error: "Canal inválido" }, { status: 400 });
  }
  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos un cliente" }, { status: 400 });
  }

  const result = await createCampaign({
    advisorId: session.advisorId,
    name: name.trim(),
    messageTemplate: messageTemplate.trim(),
    channel,
    clientIds: clientIds.filter((x: unknown): x is string => typeof x === "string"),
  });

  if (result.recipients === 0) {
    return NextResponse.json({ error: "Ninguno de los clientes seleccionados es válido" }, { status: 400 });
  }
  return NextResponse.json(result, { status: 201 });
}

export async function GET() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const campaigns = await db.referralCampaign.findMany({
    where: { advisorId: session.advisorId },
    orderBy: { createdAt: "desc" },
  });

  // Resumen ligero por campaña: audience, contactados, referidos.
  const summaries = await Promise.all(
    campaigns.map(async (c) => {
      const [audience, contacted, referrals] = await Promise.all([
        db.campaignRecipient.count({ where: { campaignId: c.id } }),
        db.campaignRecipient.count({ where: { campaignId: c.id, status: "contacted" } }),
        db.productEvent.count({ where: { campaignId: c.id, event: "referral_created" } }),
      ]);
      return { id: c.id, name: c.name, channel: c.channel, status: c.status, createdAt: c.createdAt, audience, contacted, referrals };
    })
  );

  return NextResponse.json(summaries);
}
