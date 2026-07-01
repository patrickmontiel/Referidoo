/**
 * seed-blur-test.ts
 * Crea (o reutiliza) una cuenta freemium con 15 leads para verificar
 * visualmente el blur del pipeline en el admin.
 *
 * Uso: npx tsx prisma/seed-blur-test.ts
 * Login: blur-test@referidoo.mx / BlurTest2026!
 */
import "dotenv/config";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const db = createClient({ url: process.env.DATABASE_URL ?? "file:./dev.db" });

function cuid() {
  return "c" + randomBytes(10).toString("base64url");
}

const LEADS = [
  { name: "Sofía Ramírez",    phone: "55 1111 0001", status: "pending",    product: "Daños/Auto" },
  { name: "Carlos Mendoza",   phone: "55 1111 0002", status: "contacted",  product: "GMM"        },
  { name: "Ana Torres",       phone: "55 1111 0003", status: "in_process", product: "PPR"        },
  { name: "Luis García",      phone: "55 1111 0004", status: "pending",    product: "Vida"       },
  { name: "María López",      phone: "55 1111 0005", status: "contacted",  product: "Daños/Auto" },
  { name: "Pedro Flores",     phone: "55 1111 0006", status: "pending",    product: "GMM"        },
  { name: "Isabel Vega",      phone: "55 1111 0007", status: "in_process", product: "PPR"        },
  { name: "Roberto Sánchez",  phone: "55 1111 0008", status: "pending",    product: "Vida"       },
  { name: "Lucía Morales",    phone: "55 1111 0009", status: "contacted",  product: "Daños/Auto" },
  { name: "Andrés Jiménez",   phone: "55 1111 0010", status: "pending",    product: "GMM"        },
  { name: "Elena Ruiz",       phone: "55 1111 0011", status: "in_process", product: "PPR"        },
  { name: "Miguel Castillo",  phone: "55 1111 0012", status: "pending",    product: "Otro"       },
  // Leads 13-15 — deben aparecer bloqueados con blur
  { name: "Valentina Cruz",   phone: "55 1111 0013", status: "pending",    product: "Daños/Auto" },
  { name: "Diego Herrera",    phone: "55 1111 0014", status: "contacted",  product: "GMM"        },
  { name: "Camila Ortiz",     phone: "55 1111 0015", status: "pending",    product: "Vida"       },
];

async function main() {
  // Find or create the test advisor
  const existing = await db.execute({
    sql: "SELECT id FROM Advisor WHERE email = ?",
    args: ["blur-test@referidoo.mx"],
  });

  let advisorId: string;

  if (existing.rows.length > 0) {
    advisorId = existing.rows[0].id as string;
    console.log("Asesor existente encontrado:", advisorId);
    // Remove previous test leads
    await db.execute({ sql: "DELETE FROM Referral WHERE advisorId = ?", args: [advisorId] });
    console.log("Leads anteriores eliminados");
  } else {
    advisorId = cuid();
    const password = await bcrypt.hash("BlurTest2026!", 12);
    await db.execute({
      sql: `INSERT INTO Advisor (id, name, email, password, phone, emailVerified, plan, createdAt)
            VALUES (?, ?, ?, ?, ?, 1, 'freemium', ?)`,
      args: [advisorId, "Asesor Blur Test", "blur-test@referidoo.mx", password, "55 0000 0000", new Date().toISOString()],
    });
    // Settings
    await db.execute({
      sql: `INSERT INTO AdvisorSettings (id, advisorId, afterLastTier, flatAmount) VALUES (?, ?, 'cycle', 1500)`,
      args: [cuid(), advisorId],
    });
    // Tiers
    for (const [pos, amount] of [[1, 1500], [2, 1500], [3, 2500]]) {
      await db.execute({
        sql: `INSERT INTO RewardTier (id, advisorId, position, amount, label) VALUES (?, ?, ?, ?, '')`,
        args: [cuid(), advisorId, pos, amount],
      });
    }
    // Client (referrer)
    const clientId = cuid();
    const code = "blurtest" + randomBytes(2).toString("hex");
    await db.execute({
      sql: `INSERT INTO Client (id, advisorId, name, phone, referralCode, accessToken, active, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [clientId, advisorId, "Cliente Referidor", "55 9999 0001", code, cuid(), new Date().toISOString()],
    });
    console.log("Asesor creado:", advisorId);
  }

  // Get or create the referrer client
  const clientRow = await db.execute({
    sql: "SELECT id FROM Client WHERE advisorId = ? LIMIT 1",
    args: [advisorId],
  });

  let referrerId: string;
  if (clientRow.rows.length > 0) {
    referrerId = clientRow.rows[0].id as string;
  } else {
    referrerId = cuid();
    const code2 = "blurref" + randomBytes(2).toString("hex");
    await db.execute({
      sql: `INSERT INTO Client (id, advisorId, name, phone, referralCode, accessToken, active, createdAt) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [referrerId, advisorId, "Cliente Referidor", "55 9999 0001", code2, cuid(), new Date().toISOString()],
    });
  }

  // Insert leads with createdAt spread across last 15 days
  for (let i = 0; i < LEADS.length; i++) {
    const lead = LEADS[i];
    const createdAt = new Date(Date.now() - (LEADS.length - i) * 24 * 60 * 60 * 1000).toISOString();
    await db.execute({
      sql: `INSERT INTO Referral
              (id, advisorId, referrerId, leadName, leadPhone, status, rewardAmount, rewardStatus,
               tierPosition, interestProductType, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', 0, ?, ?, ?)`,
      args: [cuid(), advisorId, referrerId, lead.name, lead.phone, lead.status, lead.product, createdAt, createdAt],
    });
    console.log(`Lead ${i + 1}/15 creado: ${lead.name} (${lead.status})${i >= 12 ? " ← BLOQUEADO" : ""}`);
  }

  console.log("\n✅ Listo. Login: blur-test@referidoo.mx / BlurTest2026!");
  console.log("   Los leads 13-15 (Valentina, Diego, Camila) deben aparecer borrosos.");
  db.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
