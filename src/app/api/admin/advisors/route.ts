import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";

function isPlatformOwner(email: string) {
  return !!process.env.PLATFORM_OWNER_EMAIL && email === process.env.PLATFORM_OWNER_EMAIL;
}

export async function GET() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const advisors = await db.advisor.findMany({
    select: { id: true, name: true, email: true, plan: true, emailVerified: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(advisors);
}
