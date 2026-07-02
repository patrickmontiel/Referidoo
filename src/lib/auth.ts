import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const SECRET = process.env.JWT_SECRET ?? "dev-secret";

if (process.env.NODE_ENV === "production" && SECRET === "dev-secret") {
  throw new Error(
    "JWT_SECRET no está configurado. Agrega JWT_SECRET a las variables de entorno de Vercel."
  );
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export type SessionPayload = {
  advisorId: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  plan?: string;
  onboardedAt?: string | null;
};

export function signToken(payload: SessionPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getAdvisorSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("advisor_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function isPlatformOwner(email: string): boolean {
  return !!process.env.PLATFORM_OWNER_EMAIL && email === process.env.PLATFORM_OWNER_EMAIL;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
};

export function setAdvisorCookie(res: NextResponse, token: string) {
  res.cookies.set("advisor_token", token, COOKIE_OPTIONS);
}

export function clearAdvisorCookie(res: NextResponse) {
  res.cookies.set("advisor_token", "", { ...COOKIE_OPTIONS, maxAge: 0 });
}
