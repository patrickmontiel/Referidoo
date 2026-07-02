import { NextResponse } from "next/server";
import { sendPreviewEmailsTo } from "@/lib/email";

const TEST_TO = "patrickkarim2002@gmail.com";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== "preview2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await sendPreviewEmailsTo(TEST_TO);
  const failed = Object.values(results).filter((v) => v.startsWith("✗")).length;

  return NextResponse.json({
    sent_to: TEST_TO,
    total: Object.keys(results).length,
    ok: Object.keys(results).length - failed,
    failed,
    results,
  });
}
