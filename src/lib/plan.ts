import { db } from "./db";

export const FREEMIUM_LEAD_LIMIT = 5;

export type ClientGateResult =
  | { allowed: true }
  | { allowed: false; reason: "unverified" };

// Clientes ilimitados en freemium — la presión de conversión viene del lead
// cap (12 totales, sin reciclaje) y del diferencial de comisiones, no de
// bloquear el registro de cartera.
export async function canAdvisorAddClients(advisorId: string): Promise<ClientGateResult> {
  const advisor = await db.advisor.findUnique({
    where: { id: advisorId },
    select: { emailVerified: true },
  });

  if (!advisor || !advisor.emailVerified) {
    return { allowed: false, reason: "unverified" };
  }

  return { allowed: true };
}

export async function remainingClientQuota(
  advisorId: string
): Promise<{ remaining: number | null; reason?: "unverified" }> {
  const advisor = await db.advisor.findUnique({
    where: { id: advisorId },
    select: { emailVerified: true },
  });

  if (!advisor || !advisor.emailVerified) {
    return { remaining: 0, reason: "unverified" };
  }

  return { remaining: null }; // sin límite
}

export function gateErrorMessage(reason: "unverified"): string {
  return "Verifica tu correo antes de agregar clientes.";
}
