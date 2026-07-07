import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor");

  const rows = await db.advisor.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      emailVerified: true,
      createdAt: true,
      deletedAt: true,
      paidUntil: true,
      paymentFailedAt: true,
      mpPreapprovalId: true,
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor = rows.length > PAGE_SIZE ? rows[PAGE_SIZE].id : null;
  return NextResponse.json({ advisors: rows.slice(0, PAGE_SIZE), nextCursor });
}
