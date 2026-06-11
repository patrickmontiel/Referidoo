import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  await client.execute("DELETE FROM Referral");
  await client.execute("DELETE FROM Client");
  console.log("✓ Referidos y clientes eliminados. El asesor Eduardo Neri sigue activo.");

  const check = await client.execute("SELECT COUNT(*) as c FROM Client");
  const refs   = await client.execute("SELECT COUNT(*) as c FROM Referral");
  console.log(`  Clientes: ${check.rows[0][0]}  |  Referidos: ${refs.rows[0][0]}`);
}

main().catch(console.error);
