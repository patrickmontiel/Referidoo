import "dotenv/config";
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const statements = [
  "CREATE INDEX IF NOT EXISTS Client_advisorId_idx ON Client(advisorId)",
  "CREATE INDEX IF NOT EXISTS BubbleClaim_clientId_idx ON BubbleClaim(clientId)",
  "CREATE INDEX IF NOT EXISTS Referral_advisorId_idx ON Referral(advisorId)",
  "CREATE INDEX IF NOT EXISTS Referral_referrerId_idx ON Referral(referrerId)",
  "CREATE INDEX IF NOT EXISTS Referral_status_idx ON Referral(status)",
];

async function main() {
  for (const sql of statements) {
    try {
      await db.execute(sql);
      console.log(`✓ ${sql}`);
    } catch (e) {
      console.log(`Info (${sql}):`, (e as Error).message);
    }
  }
}

main().finally(() => db.close());
