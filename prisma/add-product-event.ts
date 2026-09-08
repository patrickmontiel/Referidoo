import "dotenv/config";
import { createClient } from "@libsql/client";

// Crea la tabla ProductEvent (instrumentación del funnel de activación).
// Correr contra Turso (prod) con las credenciales del entorno:
//   npx tsx prisma/add-product-event.ts
// Sin FK a propósito: los eventos sobreviven a soft-deletes de Client/Referral.
const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const statements = [
  `CREATE TABLE IF NOT EXISTS "ProductEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event" TEXT NOT NULL,
    "advisorId" TEXT,
    "clientId" TEXT,
    "referralId" TEXT,
    "referralCode" TEXT,
    "channel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "ProductEvent_event_idx" ON "ProductEvent"("event")`,
  `CREATE INDEX IF NOT EXISTS "ProductEvent_advisorId_idx" ON "ProductEvent"("advisorId")`,
  `CREATE INDEX IF NOT EXISTS "ProductEvent_clientId_idx" ON "ProductEvent"("clientId")`,
  `CREATE INDEX IF NOT EXISTS "ProductEvent_createdAt_idx" ON "ProductEvent"("createdAt")`,
];

async function main() {
  for (const sql of statements) {
    try {
      await db.execute(sql);
      console.log(`✓ ${sql.split("\n")[0]}...`);
    } catch (e) {
      console.log(`Info:`, (e as Error).message);
    }
  }
}

main().finally(() => db.close());
