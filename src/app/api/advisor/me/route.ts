import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";

export async function GET() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const advisor = await db.advisor.findUnique({
    where: { id: session.advisorId },
    select: { id: true, name: true, email: true, phone: true, companyName: true, createdAt: true },
  });

  if (!advisor) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(advisor);
}
