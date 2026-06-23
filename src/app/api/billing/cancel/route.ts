import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { cancelSubscription } from "@/lib/mercadopago";

export async function POST() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const advisor = await db.advisor.findUnique({ where: { id: session.advisorId } });
  if (!advisor) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (!advisor.mpPreapprovalId) {
    return NextResponse.json({ error: "No tienes una suscripción activa" }, { status: 400 });
  }

  try {
    await cancelSubscription(advisor.mpPreapprovalId);
    // No tocamos `plan` ni `paidUntil` aquí: ya pagó el periodo actual, así
    // que mantiene `paid` hasta que `paidUntil` pase — el cron diario lo
    // baja a freemium en ese momento, no antes.
    return NextResponse.json({ ok: true, paidUntil: advisor.paidUntil });
  } catch (err) {
    console.error("[billing] Error cancelando suscripción:", err);
    return NextResponse.json({ error: "No se pudo cancelar, intenta de nuevo" }, { status: 500 });
  }
}
