import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";

// One-time cleanup endpoint — soft-deletes all non-owner advisor accounts.
// DELETE this file after running once.
export async function POST() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL!;

  const toDelete = await db.advisor.findMany({
    where: {
      email: { not: ownerEmail },
      deletedAt: null,
    },
    select: { id: true, name: true, email: true },
  });

  if (toDelete.length === 0) {
    return NextResponse.json({ ok: true, deleted: [], message: "Nada que limpiar." });
  }

  await db.advisor.updateMany({
    where: { email: { not: ownerEmail } },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    deleted: toDelete.map((a) => ({ name: a.name, email: a.email })),
    message: `${toDelete.length} cuenta(s) dadas de baja.`,
  });
}
