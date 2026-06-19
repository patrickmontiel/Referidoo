import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export function proxy(req: NextRequest) {
  const token = req.cookies.get("advisor_token")?.value;
  const session = token ? verifyToken(token) : null;

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
