import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { createSubscription } from "@/lib/mercadopago";

export async function POST() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const advisor = await db.advisor.findUnique({ where: { id: session.advisorId } });
  if (!advisor) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (advisor.plan === "paid") {
    return NextResponse.json({ error: "Ya tienes el plan pagado" }, { status: 400 });
  }

  try {
    const { preapprovalId, initPoint } = await createSubscription(advisor);

    await db.advisor.update({
      where: { id: advisor.id },
      data: { mpPreapprovalId: preapprovalId },
    });

    return NextResponse.json({ checkoutUrl: initPoint });
  } catch (err) {
    console.error("[billing] Error creando suscripción:", err);
    return NextResponse.json({ error: "No se pudo iniciar el cobro, intenta de nuevo" }, { status: 500 });
  }
}
