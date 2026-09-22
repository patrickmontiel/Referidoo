import "dotenv/config";
import { createClient } from "@libsql/client";
import { runDDL, runMigration, assertColumns, assertTables } from "./_migrate-utils";

// Data Truth: marca cuentas internas (owner, QA, e2e, demos, seeds) para que
// NUNCA entren en las métricas de Owner. Ver 12-OWNER-DATA-TRUTH-REDESIGN.md.
// ADITIVO: solo ALTER TABLE ADD COLUMN (no destructivo en SQLite/libSQL).
//
// Correr LOCAL:  DATABASE_URL="file:./dev.db" npx tsx prisma/add-analytics-excluded.ts
// Para Turso prod: lo corre Patrick con credenciales de prod (ver 13-PROD-DATA-CLEANUP-PLAN.md).
//
// NOTA: este script NO decide qué cuenta es interna — solo agrega la columna.
// Marcar cuentas es un paso de datos separado y explícito (SQL en el doc 13).
const db = createClient({
  url: process.env.DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const statements = [
  `ALTER TABLE "Advisor" ADD COLUMN "analyticsExcluded" BOOLEAN NOT NULL DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS "Advisor_analyticsExcluded_idx" ON "Advisor"("analyticsExcluded")`,
];

async function main() {
  await runDDL(db, statements);

  // Verificación: "sin error" no prueba que exista. Esto sí.
  await assertColumns(db, "Advisor", ["analyticsExcluded"]);
}

runMigration(db, main, "analyticsExcluded");
