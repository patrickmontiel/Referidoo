import "dotenv/config";
import { createClient } from "@libsql/client";

// Comp de trial "a mano": da otro mes de Pro a un asesor.
// Uso:
//   Mapear (solo lectura):   npx tsx prisma/comp-advisor.ts Ceci
//   Aplicar (escribe prod):  npx tsx prisma/comp-advisor.ts --apply <advisorId>
//
// El comp correcto NO es solo plan='paid' (el cron billing-downgrade lo revierte
// si paidUntil ya pasó). Hay que fijar plan='paid' + paidUntil = ahora+30d +
// paymentFailedAt=NULL. Este script usa el MISMO formato de fecha que ya tiene
// la columna (lo detecta del registro para no romper el tipo).

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function fmtPaidUntil(raw: unknown): string {
  if (raw === null || raw === undefined) return "null";
  if (typeof raw === "number" || typeof raw === "bigint") {
    const n = Number(raw);
    return `${raw} (${new Date(n).toISOString()})`;
  }
  return `"${String(raw)}"`;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args[0] === "--apply";

  if (apply) {
    const id = args[1];
    if (!id) { console.error("Falta el advisorId: --apply <id>"); process.exit(1); }

    const before = await client.execute({
      sql: "SELECT id, name, email, plan, paidUntil, paymentFailedAt, mpPreapprovalId, typeof(paidUntil) AS puType FROM Advisor WHERE id = ?",
      args: [id],
    });
    if (!before.rows.length) { console.error("No existe un asesor con ese id."); process.exit(1); }
    const row = before.rows[0] as Record<string, unknown>;
    console.log("Antes:", JSON.stringify({ name: row.name, email: row.email, plan: row.plan, paidUntil: fmtPaidUntil(row.paidUntil), paymentFailedAt: row.paymentFailedAt, mpPreapprovalId: row.mpPreapprovalId }, null, 2));

    // Respeta el tipo almacenado: si paidUntil es INTEGER (epoch ms) escribe número;
    // si es TEXT (ISO) escribe string ISO. Si estaba null, usa el typeof de la col.
    const newMs = Date.now() + THIRTY_DAYS_MS;
    const storesText = String(row.puType).toLowerCase() === "text";
    const newValue: number | string = storesText ? new Date(newMs).toISOString() : newMs;

    await client.execute({
      sql: "UPDATE Advisor SET plan='paid', paidUntil=?, paymentFailedAt=NULL WHERE id=?",
      args: [newValue, id],
    });

    const after = await client.execute({
      sql: "SELECT plan, paidUntil FROM Advisor WHERE id=?",
      args: [id],
    });
    const a = after.rows[0] as Record<string, unknown>;
    console.log("\n✓ Aplicado. Después:", JSON.stringify({ plan: a.plan, paidUntil: fmtPaidUntil(a.paidUntil) }, null, 2));
    console.log(`Nuevo fin de prueba: ${new Date(newMs).toISOString()}`);
    return;
  }

  // Modo mapeo (solo lectura)
  const term = args[0] ?? "Ceci";
  const like = `%${term}%`;
  const res = await client.execute({
    sql: "SELECT id, name, email, plan, paidUntil, paymentFailedAt, mpPreapprovalId, emailVerified, createdAt, deletedAt, typeof(paidUntil) AS puType FROM Advisor WHERE name LIKE ? OR email LIKE ? ORDER BY createdAt DESC",
    args: [like, like],
  });

  console.log(`\n── Coincidencias para "${term}" (${res.rows.length}) ──`);
  if (!res.rows.length) { console.log("  (ninguna) — prueba otro término"); return; }
  for (const r0 of res.rows) {
    const r = r0 as Record<string, unknown>;
    const sub = r.mpPreapprovalId ? "suscripción MP" : "trial (sin MP)";
    console.log(`\n • ${r.name} <${r.email}>`);
    console.log(`   id: ${r.id}`);
    console.log(`   plan: ${r.plan} · ${sub} · verificado: ${r.emailVerified} · baja: ${r.deletedAt ?? "no"}`);
    console.log(`   paidUntil: ${fmtPaidUntil(r.paidUntil)}  [tipo col: ${r.puType}]`);
    console.log(`   paymentFailedAt: ${r.paymentFailedAt ?? "null"}`);
  }
  console.log(`\nPara dar otro mes: npx tsx prisma/comp-advisor.ts --apply <id>`);
}

main().catch((e) => { console.error(e); process.exit(1); });
