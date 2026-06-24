import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";

export async function GET() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const advisors = await db.advisor.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      emailVerified: true,
      createdAt: true,
      paidUntil: true,
      paymentFailedAt: true,
      mpPreapprovalId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(advisors);
}
