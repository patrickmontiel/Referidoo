import "dotenv/config";
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const cols = [
  "ALTER TABLE Referral ADD COLUMN rewardPaidAt DATETIME",
  "ALTER TABLE Referral ADD COLUMN paymentNote TEXT",
  "ALTER TABLE Referral ADD COLUMN confirmedByReferrer INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE Referral ADD COLUMN referrerConfirmedAt DATETIME",
];

async function main() {
  for (const sql of cols) {
    await db.execute(sql).then(() => console.log("✓", sql.split("COLUMN ")[1]?.split(" ")[0])).catch((e: Error) => console.log("skip:", e.message.split("\n")[0]));
  }
}

main().finally(() => db.close());
