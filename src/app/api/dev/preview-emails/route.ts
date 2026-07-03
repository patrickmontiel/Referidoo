import { NextRequest, NextResponse } from "next/server";
import { sendPreviewEmailsTo } from "@/lib/email";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Pass ?to=email@example.com" }, { status: 400 });
  }
  const results = await sendPreviewEmailsTo(to);
  return NextResponse.json({ sent: true, to, results });
}
