import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { generateReferralCode } from "@/lib/utils";

type ImportRow = { name: string; phone?: string; email?: string; policyNumber?: string };

export async function POST(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { rows }: { rows: ImportRow[] } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Sin datos" }, { status: 400 });
  }

  const results: { name: string; ok: boolean; error?: string }[] = [];

  for (const row of rows) {
    if (!row.name?.trim()) {
      results.push({ name: row.name || "—", ok: false, error: "Nombre vacío" });
      continue;
    }

    try {
      let referralCode = generateReferralCode(row.name);
      for (let i = 0; i < 5; i++) {
        const existing = await db.client.findUnique({ where: { referralCode } });
        if (!existing) break;
        referralCode = generateReferralCode(row.name);
      }

      await db.client.create({
        data: {
          advisorId: session.advisorId,
          name: row.name.trim(),
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          policyNumber: row.policyNumber?.trim() || null,
          referralCode,
        },
      });
      results.push({ name: row.name, ok: true });
    } catch {
      results.push({ name: row.name, ok: false, error: "Error al crear" });
    }
  }

  const created = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  return NextResponse.json({ created, failed, results });
}
