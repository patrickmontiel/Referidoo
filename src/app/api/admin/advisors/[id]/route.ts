import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";

// Duración por defecto de un comp (acceso de regalo) si el owner no elige otra.
const DEFAULT_COMP_DAYS = 30;
const MAX_COMP_DAYS = 730;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { plan, compDays } = await req.json();

  if (plan !== "freemium" && plan !== "paid") {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  let data: { plan: string; paidUntil: Date | null; paymentFailedAt: null };

  if (plan === "paid") {
    // Un upgrade manual es un COMP (regalo), no una suscripción. `mpPreapprovalId`
    // se queda en null a propósito: así el comp no infla el MRR real.
    //
    // Fijar `paidUntil` NO es opcional, y hay que SOBREESCRIBIRLO siempre.
    // Antes esta ruta solo escribía `plan`, dejando la fecha de corte intacta, y
    // el cron de billing-downgrade revertía el regalo por dos caminos:
    //   1. si la cuenta tenía un `paidUntil` viejo (un trial ya vencido), caía en
    //      `plan="paid" AND paidUntil < now` y se expiraba en la siguiente corrida
    //      — el caso real: "sube de nivel y al otro día se quita";
    //   2. si `paidUntil` era null y la cuenta tenía más de 30 días, caía en el
    //      bloque de "stale trial".
    // Ver src/app/api/cron/billing-downgrade/route.ts.
    const days =
      typeof compDays === "number" && Number.isFinite(compDays) && compDays > 0
        ? Math.min(Math.floor(compDays), MAX_COMP_DAYS)
        : DEFAULT_COMP_DAYS;
    data = {
      plan,
      paidUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      paymentFailedAt: null,
    };
  } else {
    // Al bajar se limpia la fecha de corte: dejarla haría que la UI y las
    // métricas mostraran una vigencia que ya no existe.
    data = { plan, paidUntil: null, paymentFailedAt: null };
  }

  const advisor = await db.advisor.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      paidUntil: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  // Auditoría. Se distingue de "activated" (suscripción real de MP) a propósito:
  // un regalo no es una conversión a pago y no debe contarse como tal.
  await db.planEvent
    .create({ data: { advisorId: id, event: plan === "paid" ? "comp_granted" : "comp_revoked" } })
    .catch((err) => console.error("[admin/advisors PATCH] Error registrando PlanEvent:", err));

  return NextResponse.json(advisor);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  await db.advisor.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
