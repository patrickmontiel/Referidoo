import "dotenv/config";
import { createClient } from "@libsql/client";
import { runDDL, runMigration, assertColumns, assertTables } from "./_migrate-utils";

// Portfolio Activation Campaigns (ver 08-PORTFOLIO-CAMPAIGNS.md).
// Crea ReferralCampaign + CampaignRecipient y AGREGA campaignId/campaignRecipientId
// a ProductEvent. Estrictamente ADITIVO (CREATE ... IF NOT EXISTS + ALTER ADD
// COLUMN, que en SQLite/libSQL es aditivo y no reescribe la tabla). Correr:
//   npx tsx prisma/add-referral-campaigns.ts
// Local por defecto (file:./dev.db). Para Turso prod, con credenciales del entorno.
const db = createClient({
  url: process.env.DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const statements = [
  `CREATE TABLE IF NOT EXISTS "ReferralCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "messageTemplate" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME
  )`,
  `CREATE INDEX IF NOT EXISTS "ReferralCampaign_advisorId_idx" ON "ReferralCampaign"("advisorId")`,

  `CREATE TABLE IF NOT EXISTS "CampaignRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stage" TEXT NOT NULL DEFAULT 'initial',
    "channel" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactedAt" DATETIME
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CampaignRecipient_campaignId_clientId_key" ON "CampaignRecipient"("campaignId", "clientId")`,
  `CREATE INDEX IF NOT EXISTS "CampaignRecipient_campaignId_idx" ON "CampaignRecipient"("campaignId")`,
  `CREATE INDEX IF NOT EXISTS "CampaignRecipient_clientId_idx" ON "CampaignRecipient"("clientId")`,
  `CREATE INDEX IF NOT EXISTS "CampaignRecipient_advisorId_idx" ON "CampaignRecipient"("advisorId")`,

  // ADITIVO sobre ProductEvent (ALTER ADD COLUMN es no-destructivo en SQLite).
  `ALTER TABLE "ProductEvent" ADD COLUMN "campaignId" TEXT`,
  `ALTER TABLE "ProductEvent" ADD COLUMN "campaignRecipientId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "ProductEvent_campaignId_idx" ON "ProductEvent"("campaignId")`,
];

async function main() {
  await runDDL(db, statements);

  // Verificación: "sin error" no prueba que exista. Esto sí.
  await assertTables(db, ["ReferralCampaign", "CampaignRecipient"]);
  await assertColumns(db, "ProductEvent", ["campaignId", "campaignRecipientId"]);
}

runMigration(db, main, "referral campaigns");
