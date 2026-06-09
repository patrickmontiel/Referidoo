import "dotenv/config";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const envUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const isRemote = envUrl.startsWith("libsql://") || envUrl.startsWith("https://");
const db = createClient({
  url: envUrl,
  ...(isRemote && process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

function cuid(): string {
  return "c" + randomBytes(10).toString("base64url");
}

function randomCode(name: string): string {
  const base = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "").slice(0, 6);
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `${base}${rand}`;
}

async function main() {
  // Wipe existing data for a clean re-seed
  await db.execute("DELETE FROM Referral");
  await db.execute("DELETE FROM RewardTier");
  await db.execute("DELETE FROM AdvisorSettings");
  await db.execute("DELETE FROM Client");
  await db.execute("DELETE FROM Advisor");

  const password = await bcrypt.hash("Eduardo2026!", 12);
  const advisorId = cuid();

  await db.execute({
    sql: "INSERT INTO Advisor (id, name, email, password, phone, companyName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [
      advisorId,
      "Eduardo Neri",
      "eduardo@referidoo.mx",
      password,
      "55 1000 0000",
      "Eduardo Neri — Asesor Financiero",
      new Date().toISOString(),
    ],
  });

  await db.execute({
    sql: "INSERT INTO AdvisorSettings (id, advisorId, afterLastTier, flatAmount, whatsappMessage, welcomeMessage) VALUES (?, ?, ?, ?, ?, ?)",
    args: [
      cuid(),
      advisorId,
      "cycle",
      1500,
      "Hola {nombre}, quiero compartirte algo que a mí me ha servido mucho.\n\nTengo un plan de vida y retiro con Eduardo Neri que me está ayudando a proteger mi patrimonio. Creo que a ti también te podría interesar.\n\nSin compromiso, solo entra y revisa: {link}",
      "Tu amigo ya tiene un plan de vida y retiro. Te recomienda conocerlo porque cree que también te conviene.",
    ],
  });

  const tiers = [
    { pos: 1, amount: 1500, label: "Primer referido" },
    { pos: 2, amount: 1500, label: "Segundo referido" },
    { pos: 3, amount: 3500, label: "¡Bono especial!" },
  ];
  for (const t of tiers) {
    await db.execute({
      sql: "INSERT INTO RewardTier (id, advisorId, position, amount, label) VALUES (?, ?, ?, ?, ?)",
      args: [cuid(), advisorId, t.pos, t.amount, t.label],
    });
  }

  console.log("✓ Seed completado — Eduardo Neri");
  console.log("  Email: eduardo@referidoo.mx");
  console.log("  Contraseña: Eduardo2026!");
  console.log("\n  Acceso: http://localhost:3000/login");
}

main()
  .catch(console.error)
  .finally(() => db.close());
