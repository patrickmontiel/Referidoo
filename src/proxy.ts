import { NextRequest, NextResponse } from "next/server";
import { verifyToken, isPlatformOwner } from "@/lib/auth";

export function proxy(req: NextRequest) {
  const token = req.cookies.get("advisor_token")?.value;
  const session = token ? verifyToken(token) : null;

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // /owner es solo para el dueño de la plataforma — el email ya viene en el
  // JWT, así que se puede rechazar aquí mismo sin tocar la base de datos,
  // antes de servir cualquier HTML del shell de dueño.
  if (req.nextUrl.pathname.startsWith("/owner") && !isPlatformOwner(session.email)) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*"],
};
