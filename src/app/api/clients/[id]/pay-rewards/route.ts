import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";

// Marca como pagado TODO lo que el asesor le debe a un cliente: premios de
// escalera aprobados + burbujas reclamadas pendientes. Es la parte "adentro"
// del botón Pagar de conveniencia — el dinero se mueve por fuera (transferencia
// bancaria con la CLABE), esto solo cierra el ciclo en la app. No es un riel.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const client = await db.client.findUnique({ where: { id }, select: { advisorId: true } });
  if (!client || client.advisorId !== session.advisorId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const now = new Date();
  const [escalera, burbuja] = await Promise.all([
    db.referral.updateMany({
      where: {
        referrerId: id,
        advisorId: session.advisorId,
        rewardStatus: "approved",
        tierPosition: { gt: 0 },
        deletedAt: null,
      },
      data: { rewardStatus: "paid", rewardPaidAt: now },
    }),
    db.bubbleClaim.updateMany({
      where: { clientId: id, status: "pending" },
      data: { status: "paid", paidAt: now },
    }),
  ]);

  return NextResponse.json({ ok: true, rewardsPaid: escalera.count, claimsPaid: burbuja.count });
}
