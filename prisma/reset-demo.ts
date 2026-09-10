import "dotenv/config";
import { createClient } from "@libsql/client";
import { assertLocalDatabase } from "./_guard";

// ⚠️ DESTRUCTIVO: `DELETE FROM Referral` + `DELETE FROM Client` SIN WHERE.
// Antes apuntaba explícitamente a Turso PRODUCCIÓN (DATABASE_URL! +
// TURSO_AUTH_TOKEN!) sin ninguna confirmación — un solo comando borraba la
// cartera y los referidos de TODOS los asesores reales. Ahora solo corre local.
const url = assertLocalDatabase("reset-demo.ts");
const client = createClient({ url });

async function main() {
  await client.execute("DELETE FROM Referral");
  await client.execute("DELETE FROM Client");
  console.log("✓ Referidos y clientes eliminados. El asesor Eduardo Neri sigue activo.");

  const check = await client.execute("SELECT COUNT(*) as c FROM Client");
  const refs   = await client.execute("SELECT COUNT(*) as c FROM Referral");
  console.log(`  Clientes: ${check.rows[0][0]}  |  Referidos: ${refs.rows[0][0]}`);
}

main().catch(console.error);
