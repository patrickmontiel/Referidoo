import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { generateReferralCode } from "@/lib/utils";
import { remainingClientQuota, gateErrorMessage } from "@/lib/plan";
import { classifyImportRows, summarizeClassification, type ImportRowInput } from "@/lib/client-identity";

// CONECTAR CARTERA (antes "importar CSV").
//
// IDEMPOTENTE: reimportar el mismo archivo NO duplica. Un cliente que ya está
// en la cartera se ACTUALIZA conservando su `id`, `referralCode` y
// `accessToken` — es decir, los links y portales ya enviados siguen sirviendo.
//
// Dos modos:
//   { rows, preview: true }  → clasifica y devuelve el resumen SIN escribir.
//   { rows, resolutions }    → aplica. `resolutions` resuelve los POSIBLE_DUPLICADO
//                              por índice: "update" | "create" | "skip" (default skip).
export async function POST(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body: { rows?: ImportRowInput[]; preview?: boolean; resolutions?: Record<string, "update" | "create" | "skip"> } =
    await req.json();
  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Sin datos" }, { status: 400 });
  }

  // Cartera actual del asesor (identidad ya normalizada en DB).
  const existing = await db.client.findMany({
    where: { advisorId: session.advisorId },
    select: { id: true, name: true, normalizedPhone: true, normalizedEmail: true },
  });

  const classified = classifyImportRows(rows, existing);
  const summary = summarizeClassification(classified);

  // ── PREVIEW: no escribe nada ──
  if (body.preview) {
    return NextResponse.json({
      preview: true,
      summary,
      rows: classified.map((c, i) => ({
        index: i,
        name: c.name,
        status: c.status,
        reason: c.reason ?? null,
        matchedClientName: c.matchedClientName ?? null,
      })),
    });
  }

  const resolutions = body.resolutions ?? {};
  const results: { name: string; action: "created" | "updated" | "skipped"; reason?: string }[] = [];

  // Cupo: solo los que REALMENTE se van a crear consumen cuota (actualizar a un
  // cliente que ya está en la cartera no debe consumir nada).
  const toCreate = classified.filter(
    (c, i) =>
      c.status === "NUEVO" ||
      c.status === "NO_CONTACTABLE" ||
      (c.status === "POSIBLE_DUPLICADO" && resolutions[String(i)] === "create")
  );
  const { remaining, reason } = await remainingClientQuota(session.advisorId);
  let createBudget = remaining === null ? Number.POSITIVE_INFINITY : remaining;
  const quotaMsg = gateErrorMessage(reason ?? "unverified");
  if (createBudget < toCreate.length) {
    // Se avisará fila por fila abajo al agotarse el presupuesto.
  }

  // Códigos únicos para los que se van a crear.
  const usedInBatch = new Set<string>();
  function freshCode(name: string): string {
    let code = generateReferralCode(name);
    while (usedInBatch.has(code)) code = generateReferralCode(name);
    usedInBatch.add(code);
    return code;
  }

  for (let i = 0; i < classified.length; i++) {
    const c = classified[i];

    if (c.status === "FALTA_DATO") {
      results.push({ name: c.name || "—", action: "skipped", reason: c.reason });
      continue;
    }

    // Ya está en la cartera → ACTUALIZAR (conserva id/referralCode/accessToken).
    if (c.status === "YA_EXISTE" && c.matchedClientId) {
      await db.client.update({
        where: { id: c.matchedClientId },
        data: {
          name: c.name,
          ...(c.row.email ? { email: c.row.email.trim(), normalizedEmail: c.normalizedEmail } : {}),
          ...(c.row.phone ? { phone: c.row.phone.trim(), normalizedPhone: c.normalizedPhone } : {}),
          ...(c.row.policyNumber ? { policyNumber: c.row.policyNumber.trim() } : {}),
        },
      });
      results.push({ name: c.name, action: "updated", reason: c.reason });
      continue;
    }
    // Repetido dentro del mismo archivo, sin match en DB → no crear otra fila.
    if (c.status === "YA_EXISTE") {
      results.push({ name: c.name, action: "skipped", reason: c.reason });
      continue;
    }

    // Posible duplicado → decide el asesor. Default seguro: NO crear.
    if (c.status === "POSIBLE_DUPLICADO") {
      const decision = resolutions[String(i)] ?? "skip";
      if (decision === "update" && c.matchedClientId) {
        await db.client.update({
          where: { id: c.matchedClientId },
          data: {
            name: c.name,
            ...(c.row.email ? { email: c.row.email.trim(), normalizedEmail: c.normalizedEmail } : {}),
            ...(c.row.phone ? { phone: c.row.phone.trim(), normalizedPhone: c.normalizedPhone } : {}),
          },
        });
        results.push({ name: c.name, action: "updated", reason: "Resuelto como la misma persona" });
        continue;
      }
      if (decision === "skip") {
        results.push({ name: c.name, action: "skipped", reason: "Posible duplicado sin resolver" });
        continue;
      }
      // "create" cae al bloque de creación de abajo.
    }

    // Crear (NUEVO, NO_CONTACTABLE, o POSIBLE_DUPLICADO resuelto como "create").
    if (createBudget <= 0) {
      results.push({ name: c.name, action: "skipped", reason: quotaMsg });
      continue;
    }
    try {
      await db.client.create({
        data: {
          advisorId: session.advisorId,
          name: c.name,
          email: c.row.email?.trim() || null,
          phone: c.row.phone?.trim() || null,
          policyNumber: c.row.policyNumber?.trim() || null,
          normalizedPhone: c.normalizedPhone,
          normalizedEmail: c.normalizedEmail,
          referralCode: freshCode(c.name),
        },
      });
      createBudget--;
      results.push({ name: c.name, action: "created", reason: c.status === "NO_CONTACTABLE" ? c.reason : undefined });
    } catch {
      results.push({ name: c.name, action: "skipped", reason: "Error al crear" });
    }
  }

  const created = results.filter((r) => r.action === "created").length;
  const updated = results.filter((r) => r.action === "updated").length;
  const skipped = results.filter((r) => r.action === "skipped").length;

  return NextResponse.json({ created, updated, skipped, summary, results });
}
