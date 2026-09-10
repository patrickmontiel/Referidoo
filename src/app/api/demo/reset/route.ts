import { NextResponse } from "next/server";
import { getAdvisorSession } from "@/lib/auth";
import { db } from "@/lib/db";

// ⚠️ DESTRUCTIVO: borra TODOS los clientes y referidos del asesor autenticado.
// Quedó huérfano (ya no hay botón "Reiniciar demo" en la UI) pero seguía vivo en
// producción: cualquier asesor logueado podía borrar su cartera con un curl, y
// un asesor real podía perder su cartera por accidente. Ahora solo existe fuera
// de producción; en prod responde 404 como si la ruta no existiera.
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.referral.deleteMany({ where: { advisorId: session.advisorId } });
  await db.client.deleteMany({ where: { advisorId: session.advisorId } });
  await db.advisor.update({ where: { id: session.advisorId }, data: { onboardedAt: null } });

  return NextResponse.json({ ok: true });
}
