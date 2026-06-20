import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";

function isPlatformOwner(email: string) {
  return !!process.env.PLATFORM_OWNER_EMAIL && email === process.env.PLATFORM_OWNER_EMAIL;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { plan } = await req.json();

  if (plan !== "freemium" && plan !== "paid") {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  const advisor = await db.advisor.update({
    where: { id },
    data: { plan },
    select: { id: true, name: true, email: true, plan: true, emailVerified: true, createdAt: true },
  });

  return NextResponse.json(advisor);
}
