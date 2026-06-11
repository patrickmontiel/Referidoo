import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  const advisors  = await client.execute("SELECT id, name, email FROM Advisor");
  const clients   = await client.execute("SELECT id, name, email FROM Client");
  const referrals = await client.execute("SELECT id, leadName, status FROM Referral");

  console.log("\n── Advisors ──────────────────────");
  advisors.rows.forEach(r => console.log(` • ${r[1]} <${r[2]}>`));

  console.log("\n── Clients ───────────────────────");
  clients.rows.length
    ? clients.rows.forEach(r => console.log(` • ${r[1]} (${r[2] ?? "sin email"})`))
    : console.log("  (ninguno)");

  console.log("\n── Referrals ─────────────────────");
  referrals.rows.length
    ? referrals.rows.forEach(r => console.log(` • ${r[1]} [${r[2]}]`))
    : console.log("  (ninguno)");

  console.log("");
}

main().catch(console.error);
