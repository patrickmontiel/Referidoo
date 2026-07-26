import { NextRequest, NextResponse } from "next/server";
import { getAdvisorSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Guarda la credibilidad que el asesor muestra en la landing del referido:
// credencial real (cédula), años de experiencia y personas atendidas de por
// vida. Se captura en /admin/perfil y la lee /api/referral-info.
export async function PUT(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const credential =
    typeof body.credential === "string" ? body.credential.trim().slice(0, 120) : "";

  const toCount = (v: unknown, max: number): number | null => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.min(max, Math.round(n));
  };
  const yearsExperience = toCount(body.yearsExperience, 80);
  const peopleServed = toCount(body.peopleServed, 1_000_000);

  await db.advisorSettings.upsert({
    where: { advisorId: session.advisorId },
    create: {
      advisorId: session.advisorId,
      credential: credential || null,
      yearsExperience,
      peopleServed,
    },
    update: {
      credential: credential || null,
      yearsExperience,
      peopleServed,
    },
  });

  return NextResponse.json({ ok: true });
}
