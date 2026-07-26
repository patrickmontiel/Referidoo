import { NextRequest, NextResponse } from "next/server";
import { getReferralInfo } from "@/lib/referral-info";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const info = await getReferralInfo(code);
  if (!info) {
    return NextResponse.json({ error: "Código no válido" }, { status: 404 });
  }
  return NextResponse.json(info);
}
