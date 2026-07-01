import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SECRET = process.env.JWT_SECRET ?? "dev-secret";

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
