import { NextRequest, NextResponse } from "next/server";
import { sendPreviewEmailsTo } from "@/lib/email";

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Pass ?to=email@example.com" }, { status: 400 });
  }
  const results = await sendPreviewEmailsTo(to);
  return NextResponse.json({ sent: true, to, results });
}
