import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const baseUrl = req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL("/admin?verify=missing", baseUrl));
  }

  const advisor = await db.advisor.findUnique({ where: { verificationToken: token } });
  if (!advisor) {
    return NextResponse.redirect(new URL("/admin?verify=invalid", baseUrl));
  }

  await db.advisor.update({
    where: { id: advisor.id },
    data: { emailVerified: true, verificationToken: null },
  });

  return NextResponse.redirect(new URL("/admin?verify=success", baseUrl));
}
