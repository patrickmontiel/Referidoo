import "dotenv/config";
import { createClient } from "@libsql/client";

// FECHA DE CIERRE INMUTABLE (Referral.convertedAt).
//
// ADITIVO: solo ALTER TABLE ADD COLUMN + CREATE INDEX. NO backfillea nada por
// sí solo — el backfill es una DECISIÓN aparte porque `updatedAt` es mutable y
// usarlo a ciegas inventaría fechas falsas.
//
// Modos:
//   (sin flags)        → agrega columna + índice y REPORTA la clasificación del backfill.
//   --backfill-safe    → SOLO rellena el grupo A (evidencia temporal confiable).
//
// GRUPO A (candidato a backfill): converted cuyo `updatedAt` NO pudo haber sido
//   movido por una edición posterior, es decir updatedAt == createdAt del
//   registro o no hay señal de edición posterior al cierre. Es conservador.
// GRUPO B (UNKNOWN): converted con señales de edición posterior (carátula
//   validada, premio pagado/aprobado después) → su fecha real es DESCONOCIDA.
//   Se dejan en NULL a propósito. Owner los excluye de métricas TEMPORALES pero
//   los sigue contando en el total histórico de cerrados.
//
// Local: DATABASE_URL="file:./dev.db" npx tsx prisma/add-converted-at.ts
// Prod : lo corre Patrick (ver 13-PROD-DATA-CLEANUP-PLAN.md). NO ejecutado aún.
const db = createClient({
  url: process.env.DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const APPLY = process.argv.includes("--backfill-safe");

const ddl = [
  `ALTER TABLE "Referral" ADD COLUMN "convertedAt" DATETIME`,
  `CREATE INDEX IF NOT EXISTS "Referral_convertedAt_idx" ON "Referral"("convertedAt")`,
];

async function main() {
  for (const sql of ddl) {
    try {
      await db.execute(sql);
      console.log(`✓ ${sql.slice(0, 78)}...`);
    } catch (e) {
      console.log(`Info:`, (e as Error).message); // duplicate column = ya corrido
    }
  }

  // ── Clasificación del backfill ──────────────────────────────────────────
  // Señal de edición posterior al cierre: carátula subida/validada, premio
  // aprobado o pagado. Si existe, `updatedAt` ya no representa el cierre.
  const groupA = await db.execute(`
    SELECT COUNT(*) n FROM "Referral"
    WHERE status = 'converted' AND "convertedAt" IS NULL
      AND "caratulaUrl" IS NULL
      AND "rewardApprovedAt" IS NULL
      AND "rewardPaidAt" IS NULL
      AND "billedAt" IS NULL
  `);
  const groupB = await db.execute(`
    SELECT COUNT(*) n FROM "Referral"
    WHERE status = 'converted' AND "convertedAt" IS NULL
      AND ("caratulaUrl" IS NOT NULL
        OR "rewardApprovedAt" IS NOT NULL
        OR "rewardPaidAt" IS NOT NULL
        OR "billedAt" IS NOT NULL)
  `);
  const total = await db.execute(`SELECT COUNT(*) n FROM "Referral" WHERE status='converted'`);

  console.log(`\n── Clasificación del backfill ──`);
  console.log(`  convertidos totales            : ${total.rows[0].n}`);
  console.log(`  GRUPO A (evidencia confiable)  : ${groupA.rows[0].n}  → updatedAt ≈ fecha de cierre`);
  console.log(`  GRUPO B (UNKNOWN, se deja NULL): ${groupB.rows[0].n}  → editado después del cierre`);

  if (!APPLY) {
    console.log(`\n(DRY RUN — no se escribió ninguna fecha. Usa --backfill-safe para rellenar SOLO el grupo A.)`);
    return;
  }

  const res = await db.execute(`
    UPDATE "Referral" SET "convertedAt" = "updatedAt"
    WHERE status = 'converted' AND "convertedAt" IS NULL
      AND "caratulaUrl" IS NULL
      AND "rewardApprovedAt" IS NULL
      AND "rewardPaidAt" IS NULL
      AND "billedAt" IS NULL
  `);
  console.log(`\n✓ backfill seguro aplicado a ${res.rowsAffected} referidos (grupo A).`);
  console.log(`  El grupo B queda en NULL a propósito: su fecha real es desconocida.`);
}

main().finally(() => db.close());
