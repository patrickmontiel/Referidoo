import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { generateReferralCode } from "@/lib/utils";
import { remainingClientQuota, gateErrorMessage } from "@/lib/plan";

type ImportRow = { name: string; phone?: string; email?: string; policyNumber?: string };

export async function POST(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { rows }: { rows: ImportRow[] } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Sin datos" }, { status: 400 });
  }

  const results: { name: string; ok: boolean; error?: string }[] = [];
  let validRows = rows.filter((row): row is ImportRow => {
    if (!row.name?.trim()) {
      results.push({ name: row.name || "—", ok: false, error: "Nombre vacío" });
      return false;
    }
    return true;
  });

  // Cupo restante calculado UNA sola vez antes del loop paralelo de creación
  // (no fila por fila): evita N queries de conteo y una condición de carrera
  // donde varias filas en el mismo chunk leerían el mismo conteo antes de que
  // ninguna se hubiera insertado todavía.
  const { remaining, reason } = await remainingClientQuota(session.advisorId);
  if (remaining !== null && validRows.length > remaining) {
    const blocked = validRows.slice(remaining);
    const errorMsg = gateErrorMessage(reason ?? "unverified");
    blocked.forEach((row) => results.push({ name: row.name, ok: false, error: errorMsg }));
    validRows = validRows.slice(0, remaining);
  }

  // Genera códigos únicos dentro del lote en memoria, y verifica colisiones
  // contra la DB con un solo findMany en vez de hasta 5 queries por fila.
  const usedInBatch = new Set<string>();
  const rowsWithCode = validRows.map((row) => {
    let referralCode = generateReferralCode(row.name);
    while (usedInBatch.has(referralCode)) referralCode = generateReferralCode(row.name);
    usedInBatch.add(referralCode);
    return { row, referralCode };
  });

  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await db.client.findMany({
      where: { referralCode: { in: rowsWithCode.map((r) => r.referralCode) } },
      select: { referralCode: true },
    });
    if (existing.length === 0) break;
    const taken = new Set(existing.map((e) => e.referralCode));
    for (const entry of rowsWithCode) {
      if (!taken.has(entry.referralCode)) continue;
      let referralCode = generateReferralCode(entry.row.name);
      while (usedInBatch.has(referralCode)) referralCode = generateReferralCode(entry.row.name);
      usedInBatch.delete(entry.referralCode);
      usedInBatch.add(referralCode);
      entry.referralCode = referralCode;
    }
  }

  const CHUNK_SIZE = 20;
  for (let i = 0; i < rowsWithCode.length; i += CHUNK_SIZE) {
    const chunk = rowsWithCode.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map(async ({ row, referralCode }) => {
        try {
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
          return { name: row.name, ok: true };
        } catch {
          return { name: row.name, ok: false, error: "Error al crear" };
        }
      })
    );
    results.push(...chunkResults);
  }

  const created = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  return NextResponse.json({ created, failed, results });
}
