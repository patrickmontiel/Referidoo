import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN!;
const client = createClient({ url, authToken });

async function main() {
  await client.execute(
    "ALTER TABLE Client ADD COLUMN launchBonusUsed INTEGER NOT NULL DEFAULT 0"
  ).catch((e: Error) => {
    if (e.message.includes("duplicate column")) console.log("launchBonusUsed ya existe");
    else throw e;
  });
  console.log("✓ Migración completa");
}

main().catch(console.error);
