import { NextResponse } from "next/server";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { createClient } from "@libsql/client";

export async function POST() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const results: string[] = [];

  // Add launchBonusUsed column if missing
  try {
    await db.execute("ALTER TABLE Client ADD COLUMN launchBonusUsed INTEGER NOT NULL DEFAULT 0");
    results.push("✓ launchBonusUsed added");
  } catch {
    results.push("– launchBonusUsed already exists");
  }

  // Add productType column if missing
  try {
    await db.execute("ALTER TABLE Referral ADD COLUMN productType TEXT");
    results.push("✓ productType added");
  } catch {
    results.push("– productType already exists");
  }

  // Add bubblePoints column if missing
  try {
    await db.execute("ALTER TABLE Client ADD COLUMN bubblePoints INTEGER NOT NULL DEFAULT 0");
    results.push("✓ bubblePoints added");
  } catch {
    results.push("– bubblePoints already exists");
  }

  // Create BubbleClaim table if missing
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS BubbleClaim (
      id TEXT PRIMARY KEY,
      clientId TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      paymentNote TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      paidAt DATETIME,
      FOREIGN KEY (clientId) REFERENCES Client(id) ON DELETE CASCADE
    )`);
    results.push("✓ BubbleClaim table ready");
  } catch {
    results.push("– BubbleClaim table already exists");
  }

  // Add bubble settings columns to AdvisorSettings if missing
  try {
    await db.execute("ALTER TABLE AdvisorSettings ADD COLUMN bubbleAutoPoints INTEGER NOT NULL DEFAULT 150");
    results.push("✓ bubbleAutoPoints added");
  } catch {
    results.push("– bubbleAutoPoints already exists");
  }

  try {
    await db.execute("ALTER TABLE AdvisorSettings ADD COLUMN bubbleGmmPoints INTEGER NOT NULL DEFAULT 300");
    results.push("✓ bubbleGmmPoints added");
  } catch {
    results.push("– bubbleGmmPoints already exists");
  }

  try {
    await db.execute("ALTER TABLE AdvisorSettings ADD COLUMN bubbleClaimThreshold INTEGER NOT NULL DEFAULT 500");
    results.push("✓ bubbleClaimThreshold added");
  } catch {
    results.push("– bubbleClaimThreshold already exists");
  }

  // Add deletedAt column to Advisor if missing (soft delete support)
  try {
    await db.execute(`ALTER TABLE "Advisor" ADD COLUMN "deletedAt" DATETIME`);
    results.push("✓ deletedAt added");
  } catch {
    results.push("– deletedAt already exists");
  }

  // Carátula de póliza: evidencia del monto reportado (jul 2026)
  try {
    await db.execute(`ALTER TABLE "Referral" ADD COLUMN "caratulaUrl" TEXT`);
    results.push("✓ caratulaUrl added");
  } catch {
    results.push("– caratulaUrl already exists");
  }

  try {
    await db.execute(`ALTER TABLE "Referral" ADD COLUMN "caratulaStatus" TEXT`);
    results.push("✓ caratulaStatus added");
  } catch {
    results.push("– caratulaStatus already exists");
  }

  // Timestamp de primer contacto + datos bancarios del cliente (jul 2026)
  try {
    await db.execute(`ALTER TABLE "Referral" ADD COLUMN "contactedAt" DATETIME`);
    results.push("✓ contactedAt added");
  } catch {
    results.push("– contactedAt already exists");
  }

  for (const col of ["clabe", "clabeBank", "clabeHolder"]) {
    try {
      await db.execute(`ALTER TABLE "Client" ADD COLUMN "${col}" TEXT`);
      results.push(`✓ ${col} added`);
    } catch {
      results.push(`– ${col} already exists`);
    }
  }

  // Briefing de IA cacheado en /owner (jul 2026)
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS "OwnerBriefing" (
      "id" TEXT PRIMARY KEY,
      "narrative" TEXT NOT NULL,
      "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    results.push("✓ OwnerBriefing table ready");
  } catch {
    results.push("– OwnerBriefing table already exists");
  }

  // Soft delete de referidos (jul 2026)
  try {
    await db.execute(`ALTER TABLE "Referral" ADD COLUMN "deletedAt" DATETIME`);
    results.push("✓ deletedAt (Referral) added");
  } catch {
    results.push("– deletedAt (Referral) already exists");
  }

  // Preferencias de contacto del lead + ancla del corte de comisión (jul 2026)
  for (const col of ["preferredDays", "preferredHours"]) {
    try {
      await db.execute(`ALTER TABLE "Referral" ADD COLUMN "${col}" TEXT`);
      results.push(`✓ ${col} added`);
    } catch {
      results.push(`– ${col} already exists`);
    }
  }
  try {
    await db.execute(`ALTER TABLE "Referral" ADD COLUMN "rewardApprovedAt" DATETIME`);
    results.push("✓ rewardApprovedAt added");
  } catch {
    results.push("– rewardApprovedAt already exists");
  }

  // Link de agenda del asesor (Calendly/Cal.com/Google) para el botón
  // "Agendar cita" del formulario de referido (jul 2026)
  try {
    await db.execute(`ALTER TABLE "AdvisorSettings" ADD COLUMN "schedulingUrl" TEXT`);
    results.push("✓ schedulingUrl added");
  } catch {
    results.push("– schedulingUrl already exists");
  }

  return NextResponse.json({ ok: true, results });
}
