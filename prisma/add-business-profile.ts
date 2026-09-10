import "dotenv/config";
import { createClient } from "@libsql/client";

// Perfil de negocio mínimo en AdvisorSettings: `products` y `defaultChannel`.
// Son las DOS únicas preguntas del recovery flow, porque son las dos únicas
// que cambian el producto (ver 09-ONBOARDING-PRODUCT-MODEL-AUDIT.md).
//
// ADITIVO: solo ALTER TABLE ADD COLUMN (nullable). null = aún no se preguntó.
// Local: DATABASE_URL="file:./dev.db" npx tsx prisma/add-business-profile.ts
// Prod : lo corre Patrick (ver 13-PROD-DATA-CLEANUP-PLAN.md).
const db = createClient({
  url: process.env.DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const statements = [
  `ALTER TABLE "AdvisorSettings" ADD COLUMN "products" TEXT`,
  `ALTER TABLE "AdvisorSettings" ADD COLUMN "defaultChannel" TEXT`,
];

async function main() {
  for (const sql of statements) {
    try {
      await db.execute(sql);
      console.log(`✓ ${sql.slice(0, 78)}...`);
    } catch (e) {
      console.log(`Info:`, (e as Error).message); // duplicate column = ya corrido
    }
  }
}

main().finally(() => db.close());
