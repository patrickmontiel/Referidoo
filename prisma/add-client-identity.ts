import "dotenv/config";
import { createClient } from "@libsql/client";
import { runDDL, runMigration, assertColumns, assertTables } from "./_migrate-utils";

// CARTERA PERSISTENTE: claves de identidad para deduplicar la cartera.
// Agrega Client.normalizedPhone / normalizedEmail / updatedAt + índices, y
// BACKFILLEA los valores normalizados de las filas existentes.
//
// ADITIVO: solo ALTER TABLE ADD COLUMN + CREATE INDEX + UPDATE de columnas
// nuevas. No borra ni reescribe datos existentes (name/phone/email intactos).
//
// Local:  DATABASE_URL="file:./dev.db" npx tsx prisma/add-client-identity.ts
// Prod:   lo corre Patrick (ver 13-PROD-DATA-CLEANUP-PLAN.md).
const db = createClient({
  url: process.env.DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const ddl = [
  `ALTER TABLE "Client" ADD COLUMN "normalizedPhone" TEXT`,
  `ALTER TABLE "Client" ADD COLUMN "normalizedEmail" TEXT`,
  // SQLite no permite ADD COLUMN con default no-constante (CURRENT_TIMESTAMP),
  // así que se agrega nullable y se backfillea desde createdAt más abajo.
  // Prisma siempre escribe updatedAt en create/update (@default(now()) @updatedAt).
  `ALTER TABLE "Client" ADD COLUMN "updatedAt" DATETIME`,
  `CREATE INDEX IF NOT EXISTS "Client_advisorId_normalizedPhone_idx" ON "Client"("advisorId", "normalizedPhone")`,
  `CREATE INDEX IF NOT EXISTS "Client_advisorId_normalizedEmail_idx" ON "Client"("advisorId", "normalizedEmail")`,
];

// Backfill: mismas reglas que src/lib/client-identity.ts
//  - phone → solo dígitos, últimos 10
//  - email → trim + lowercase
function normPhone(phone: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  if (!d) return null;
  return d.length > 10 ? d.slice(-10) : d;
}
function normEmail(email: string | null): string | null {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  return e || null;
}

async function main() {
  await runDDL(db, ddl);

  // Backfill de updatedAt: las filas existentes nunca se han "actualizado",
  // así que su updatedAt honesto es su createdAt.
  try {
    const r = await db.execute(`UPDATE "Client" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL`);
    console.log(`✓ updatedAt backfilleado desde createdAt (${r.rowsAffected} filas)`);
  } catch (e) {
    console.log(`Info:`, (e as Error).message);
  }

  // Backfill de las filas existentes.
  const rows = await db.execute(`SELECT id, phone, email FROM "Client"`);
  let updated = 0;
  for (const r of rows.rows) {
    const id = r.id as string;
    const p = normPhone((r.phone as string | null) ?? null);
    const e = normEmail((r.email as string | null) ?? null);
    await db.execute({
      sql: `UPDATE "Client" SET "normalizedPhone" = ?, "normalizedEmail" = ? WHERE id = ?`,
      args: [p, e, id],
    });
    updated++;
  }
  console.log(`✓ backfill de identidad en ${updated} clientes`);

  // Reporte de duplicados YA existentes (no los toca — solo informa).
  const dups = await db.execute(`
    SELECT "advisorId", "normalizedPhone", COUNT(*) n
    FROM "Client"
    WHERE "normalizedPhone" IS NOT NULL
    GROUP BY "advisorId", "normalizedPhone"
    HAVING COUNT(*) > 1
  `);
  if (dups.rows.length > 0) {
    console.log(`\n⚠️  ${dups.rows.length} grupo(s) de clientes duplicados por teléfono dentro del mismo asesor.`);
    console.log(`   NO se fusionan automáticamente — requieren decisión (ver doc 13).`);
  } else {
    console.log(`✓ sin duplicados por teléfono dentro de un mismo asesor`);
  }

  // Verificación: "sin error" no prueba que exista. Esto sí.
  await assertColumns(db, "Client", ["normalizedPhone", "normalizedEmail", "updatedAt"]);
}

runMigration(db, main, "client identity");
