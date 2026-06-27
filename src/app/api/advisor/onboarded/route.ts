import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";

export async function POST() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await db.advisor.update({
    where: { id: session.advisorId },
    data: { onboardedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
