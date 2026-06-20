import { db } from "./db";

export const FREEMIUM_CLIENT_LIMIT = 2;

export type ClientGateResult =
  | { allowed: true }
  | { allowed: false; reason: "unverified" | "plan_limit" };

// Cuenta TODOS los clientes que el asesor creó alguna vez (sin filtrar por
// `active`) a propósito: si contáramos solo activos, un asesor freemium
// podría desactivar clientes para "liberar" espacio y registrar otros nuevos
// sin límite real.
export async function canAdvisorAddClients(advisorId: string): Promise<ClientGateResult> {
  const advisor = await db.advisor.findUnique({
    where: { id: advisorId },
    select: { plan: true, emailVerified: true },
  });

  if (!advisor || !advisor.emailVerified) {
    return { allowed: false, reason: "unverified" };
  }

  if (advisor.plan === "paid") {
    return { allowed: true };
  }

  const clientCount = await db.client.count({ where: { advisorId } });
  if (clientCount >= FREEMIUM_CLIENT_LIMIT) {
    return { allowed: false, reason: "plan_limit" };
  }

  return { allowed: true };
}

// Para el import masivo: una sola lectura de cupo restante antes del loop,
// en vez de un chequeo por fila (evita N queries y una condición de carrera
// si las filas se crean en paralelo).
export async function remainingClientQuota(
  advisorId: string
): Promise<{ remaining: number | null; reason?: "unverified" | "plan_limit" }> {
  const advisor = await db.advisor.findUnique({
    where: { id: advisorId },
    select: { plan: true, emailVerified: true },
  });

  if (!advisor || !advisor.emailVerified) {
    return { remaining: 0, reason: "unverified" };
  }
  if (advisor.plan === "paid") {
    return { remaining: null }; // sin límite
  }

  const clientCount = await db.client.count({ where: { advisorId } });
  const remaining = Math.max(0, FREEMIUM_CLIENT_LIMIT - clientCount);
  return { remaining, reason: remaining === 0 ? "plan_limit" : undefined };
}

export function gateErrorMessage(reason: "unverified" | "plan_limit"): string {
  if (reason === "unverified") {
    return "Verifica tu correo antes de agregar clientes.";
  }
  return `Límite de plan alcanzado (máximo ${FREEMIUM_CLIENT_LIMIT} clientes en freemium). Actualiza tu plan para agregar más.`;
}
