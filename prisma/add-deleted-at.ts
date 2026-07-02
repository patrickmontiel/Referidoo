import "dotenv/config";
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const statements = [
  `ALTER TABLE "Advisor" ADD COLUMN "deletedAt" DATETIME`,
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
