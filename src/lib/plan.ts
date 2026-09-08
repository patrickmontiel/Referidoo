import { db } from "./db";

// Re-export de la fuente única (src/lib/limits.ts). No redefinir aquí: los
// clientes deben importar de "@/lib/limits" para no arrastrar Prisma al bundle.
export { FREEMIUM_LEAD_LIMIT } from "./limits";

export type ClientGateResult =
  | { allowed: true }
  | { allowed: false; reason: "unverified" };

// Clientes ilimitados en freemium — la presión de conversión viene del lead
// cap (5 leads en el pipeline, sin reciclaje) y del diferencial de comisiones,
// no de bloquear el registro de cartera.
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
