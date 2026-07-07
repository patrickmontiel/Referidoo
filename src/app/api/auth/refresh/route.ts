import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, signToken, setAdvisorCookie } from "@/lib/auth";

// Re-firma el JWT contra la base. Cura los tokens viejos: correo verificado
// en OTRO dispositivo, plan cambiado por webhook/cron, nombre editado — el
// shell del admin lo llama al montar y sincroniza banner y label de plan.
export async function POST() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const advisor = await db.advisor.findUnique({
    where: { id: session.advisorId },
    select: { id: true, email: true, name: true, emailVerified: true, plan: true, onboardedAt: true, deletedAt: true },
  });
  if (!advisor || advisor.deletedAt) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const token = signToken({
    advisorId: advisor.id,
    email: advisor.email,
    name: advisor.name,
    emailVerified: advisor.emailVerified,
    plan: advisor.plan,
    onboardedAt: advisor.onboardedAt?.toISOString() ?? null,
  });

  const res = NextResponse.json({
    name: advisor.name,
    emailVerified: advisor.emailVerified,
    plan: advisor.plan,
    onboardedAt: advisor.onboardedAt?.toISOString() ?? null,
  });
  setAdvisorCookie(res, token);
  return res;
}
