import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, signToken, setAdvisorCookie } from "@/lib/auth";

export async function POST() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const onboardedAt = new Date();
  const advisor = await db.advisor.update({
    where: { id: session.advisorId },
    data: { onboardedAt },
    select: { name: true, emailVerified: true, plan: true },
  });

  const newToken = signToken({
    advisorId: session.advisorId,
    email: session.email,
    name: advisor.name,
    emailVerified: advisor.emailVerified,
    plan: advisor.plan,
    onboardedAt: onboardedAt.toISOString(),
  });

  const res = NextResponse.json({ ok: true });
  setAdvisorCookie(res, newToken);
  return res;
}
