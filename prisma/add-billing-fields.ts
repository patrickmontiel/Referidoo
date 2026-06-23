import "dotenv/config";
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  await db
    .execute("ALTER TABLE Advisor ADD COLUMN mpPreapprovalId TEXT")
    .then(() => console.log("✓ mpPreapprovalId añadido"))
    .catch((e: Error) => console.log("Info (mpPreapprovalId):", e.message));

  await db
    .execute("CREATE UNIQUE INDEX IF NOT EXISTS Advisor_mpPreapprovalId_key ON Advisor(mpPreapprovalId)")
    .then(() => console.log("✓ índice único de mpPreapprovalId creado"))
    .catch((e: Error) => console.log("Info (index):", e.message));

  await db
    .execute("ALTER TABLE Advisor ADD COLUMN paidUntil DATETIME")
    .then(() => console.log("✓ paidUntil añadido"))
    .catch((e: Error) => console.log("Info (paidUntil):", e.message));

  await db
    .execute("ALTER TABLE Advisor ADD COLUMN paymentFailedAt DATETIME")
    .then(() => console.log("✓ paymentFailedAt añadido"))
    .catch((e: Error) => console.log("Info (paymentFailedAt):", e.message));
}

main().finally(() => db.close());
