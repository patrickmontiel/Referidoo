import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SECRET = process.env.JWT_SECRET ?? "dev-secret";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { advisorId: string; email: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { advisorId: string; email: string } | null {
  try {
    return jwt.verify(token, SECRET) as { advisorId: string; email: string };
  } catch {
    return null;
  }
}

export async function getAdvisorSession(): Promise<{ advisorId: string; email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("advisor_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function isPlatformOwner(email: string): boolean {
  return !!process.env.PLATFORM_OWNER_EMAIL && email === process.env.PLATFORM_OWNER_EMAIL;
}
