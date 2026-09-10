// ESTADO DEL ASESOR — derivado, nunca persistido.
//
// Un asesor que YA tiene cartera no debe vivir el onboarding de cuenta nueva.
// El estado se calcula de hechos reales de la DB, así que no hay un flag que
// se pueda desincronizar, ni "recovery completado" que haya que recordar:
// en cuanto existe una activación, el estado deja de ser RECOVERY_NEEDED solo.
//
// No se usa UNA heurística frágil: se combinan cartera, activaciones y
// referidos, y cada transición es explícita.

export type AdvisorState =
  /** Sin cartera: no hay nada que "recuperar" → onboarding de cuenta nueva (legacy). */
  | "NEW"
  /** Tiene cartera pero nunca activó: es el caso Ceci. Aquí vive el recovery. */
  | "RECOVERY_NEEDED"
  /** Ya activó al menos una vez, pero todavía no le cae ningún referido. */
  | "READY"
  /** Ya recibió ≥1 referido real: operación normal, sin superficies de setup. */
  | "ACTIVATED";

export type AdvisorFacts = {
  /** Clientes activos en la cartera. */
  clientCount: number;
  /** Activaciones creadas (ReferralCampaign) — el hecho que cierra el recovery. */
  activationCount: number;
  /** Referidos reales recibidos (no borrados). */
  referralCount: number;
};

/**
 * Orden de evaluación (de más avanzado a menos), para que un asesor nunca
 * "retroceda" a una superficie de setup que ya superó:
 *   1. ¿ya le cayó un referido?      → ACTIVATED
 *   2. ¿ya activó alguna vez?        → READY
 *   3. ¿tiene cartera?               → RECOVERY_NEEDED
 *   4. si no                          → NEW
 */
export function deriveAdvisorState(facts: AdvisorFacts): AdvisorState {
  if (facts.referralCount > 0) return "ACTIVATED";
  if (facts.activationCount > 0) return "READY";
  if (facts.clientCount > 0) return "RECOVERY_NEEDED";
  return "NEW";
}

/** El recovery solo se muestra en RECOVERY_NEEDED. Nunca reaparece después. */
export function shouldShowRecovery(state: AdvisorState): boolean {
  return state === "RECOVERY_NEEDED";
}

/** El onboarding legacy (welcome + tour + Primeros Pasos) solo aplica a NEW. */
export function shouldShowLegacyOnboarding(state: AdvisorState): boolean {
  return state === "NEW";
}

export type SetupProgress = {
  label: string;
  done: boolean;
}[];

/**
 * Progreso REAL: cada ítem es un hecho verificable, no un paso decorativo.
 * No se inventa avance — si algo no está configurado, sale sin marcar.
 */
export function computeSetupProgress(params: {
  clientCount: number;
  hasProducts: boolean;
  hasTiers: boolean;
  hasChannel: boolean;
  activationCount: number;
}): SetupProgress {
  return [
    { label: `${params.clientCount} clientes conectados`, done: params.clientCount > 0 },
    { label: "Productos que vendes", done: params.hasProducts },
    { label: "Premios configurados", done: params.hasTiers },
    { label: "Canal para activar", done: params.hasChannel },
    { label: "Primera activación", done: params.activationCount > 0 },
  ];
}

/**
 * Tamaño sugerido de la PRIMERA activación. Es una sugerencia editable, no una
 * regla: empezar con un grupo permite afinar el mensaje antes de mandarlo a
 * toda la cartera. No se "hardcodea 30" como verdad universal.
 */
export function suggestedFirstActivationSize(portfolioSize: number): number {
  if (portfolioSize < 25) return portfolioSize; // cartera chica: todos
  if (portfolioSize <= 100) return Math.min(30, portfolioSize);
  return Math.min(50, Math.max(30, Math.round(portfolioSize * 0.2)));
}
