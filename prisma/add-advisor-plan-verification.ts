import "dotenv/config";
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  await db
    .execute("ALTER TABLE Advisor ADD COLUMN plan TEXT NOT NULL DEFAULT 'freemium'")
    .then(() => console.log("✓ plan añadido"))
    .catch((e: Error) => console.log("Info (plan):", e.message));

  await db
    .execute("ALTER TABLE Advisor ADD COLUMN emailVerified BOOLEAN NOT NULL DEFAULT false")
    .then(() => console.log("✓ emailVerified añadido"))
    .catch((e: Error) => console.log("Info (emailVerified):", e.message));

  await db
    .execute("ALTER TABLE Advisor ADD COLUMN verificationToken TEXT")
    .then(() => console.log("✓ verificationToken añadido"))
    .catch((e: Error) => console.log("Info (verificationToken):", e.message));

  await db
    .execute("CREATE UNIQUE INDEX IF NOT EXISTS Advisor_verificationToken_key ON Advisor(verificationToken)")
    .then(() => console.log("✓ índice único de verificationToken creado"))
    .catch((e: Error) => console.log("Info (index):", e.message));

  // Asesores existentes (creados antes de este cambio) no necesitan verificar
  // su correo retroactivamente ni quedar limitados por el gate freemium.
  await db
    .execute("UPDATE Advisor SET emailVerified = true, plan = 'paid' WHERE emailVerified = false")
    .then((r) => console.log(`✓ ${r.rowsAffected} asesor(es) existentes marcados como verificados/paid`))
    .catch((e: Error) => console.log("Info (backfill):", e.message));
}

main().finally(() => db.close());
