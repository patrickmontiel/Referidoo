import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, ...(authToken ? { authToken } : {}) });

const SQL = `
CREATE TABLE IF NOT EXISTS "Advisor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "companyName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AdvisorSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advisorId" TEXT NOT NULL,
    "afterLastTier" TEXT NOT NULL DEFAULT 'cycle',
    "flatAmount" INTEGER NOT NULL DEFAULT 1500,
    "whatsappMessage" TEXT,
    "welcomeMessage" TEXT,
    FOREIGN KEY ("advisorId") REFERENCES "Advisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "RewardTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advisorId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "label" TEXT,
    FOREIGN KEY ("advisorId") REFERENCES "Advisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "policyNumber" TEXT,
    "accessToken" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "active" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("advisorId") REFERENCES "Advisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advisorId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "leadName" TEXT NOT NULL,
    "leadPhone" TEXT NOT NULL,
    "leadEmail" TEXT,
    "leadNotes" TEXT,
    "tierPosition" INTEGER NOT NULL,
    "rewardAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rewardStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("advisorId") REFERENCES "Advisor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("referrerId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Advisor_email_key" ON "Advisor"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "AdvisorSettings_advisorId_key" ON "AdvisorSettings"("advisorId");
CREATE UNIQUE INDEX IF NOT EXISTS "RewardTier_advisorId_position_key" ON "RewardTier"("advisorId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "Client_accessToken_key" ON "Client"("accessToken");
CREATE UNIQUE INDEX IF NOT EXISTS "Client_referralCode_key" ON "Client"("referralCode");
`;

async function main() {
  const statements = SQL.split(";").map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await db.execute(stmt);
  }
  console.log("✓ Schema aplicado a Turso");
}

main().catch(console.error).finally(() => db.close());
