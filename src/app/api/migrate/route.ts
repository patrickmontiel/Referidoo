import { NextResponse } from "next/server";
import { getAdvisorSession } from "@/lib/auth";
import { createClient } from "@libsql/client";

export async function POST() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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

  return NextResponse.json({ ok: true, results });
}
