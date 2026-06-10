import { NextResponse } from "next/server";
import { getAdvisorSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.referral.deleteMany({});
  await db.client.deleteMany({});

  return NextResponse.json({ ok: true });
}
