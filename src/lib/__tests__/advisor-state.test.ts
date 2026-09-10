import { describe, it, expect } from "vitest";
import {
  deriveAdvisorState,
  shouldShowRecovery,
  shouldShowLegacyOnboarding,
  computeSetupProgress,
  suggestedFirstActivationSize,
} from "@/lib/advisor-state";

describe("deriveAdvisorState — estado derivado, no persistido", () => {
  it("asesor existente CON cartera y SIN activaciones → RECOVERY_NEEDED (caso Ceci)", () => {
    expect(deriveAdvisorState({ clientCount: 4, activationCount: 0, referralCount: 0 })).toBe("RECOVERY_NEEDED");
  });

  it("asesor SIN cartera → NEW (no es recovery: no hay nada que recuperar)", () => {
    expect(deriveAdvisorState({ clientCount: 0, activationCount: 0, referralCount: 0 })).toBe("NEW");
  });

  it("ya activó al menos una vez → READY (el recovery NO reaparece)", () => {
    expect(deriveAdvisorState({ clientCount: 31, activationCount: 1, referralCount: 0 })).toBe("READY");
  });

  it("ya recibió un referido → ACTIVATED", () => {
    expect(deriveAdvisorState({ clientCount: 31, activationCount: 1, referralCount: 2 })).toBe("ACTIVATED");
  });

  it("un referido sin activaciones registradas igual cuenta como ACTIVATED (no retrocede)", () => {
    expect(deriveAdvisorState({ clientCount: 5, activationCount: 0, referralCount: 1 })).toBe("ACTIVATED");
  });
});

describe("qué superficie se muestra", () => {
  it("el recovery SOLO aparece en RECOVERY_NEEDED", () => {
    expect(shouldShowRecovery("RECOVERY_NEEDED")).toBe(true);
    expect(shouldShowRecovery("NEW")).toBe(false);
    expect(shouldShowRecovery("READY")).toBe(false);
    expect(shouldShowRecovery("ACTIVATED")).toBe(false);
  });

  it("el onboarding legacy SOLO aplica a cuentas sin cartera", () => {
    expect(shouldShowLegacyOnboarding("NEW")).toBe(true);
    expect(shouldShowLegacyOnboarding("RECOVERY_NEEDED")).toBe(false);
    expect(shouldShowLegacyOnboarding("ACTIVATED")).toBe(false);
  });

  it("recovery y onboarding legacy son MUTUAMENTE EXCLUYENTES", () => {
    for (const s of ["NEW", "RECOVERY_NEEDED", "READY", "ACTIVATED"] as const) {
      expect(shouldShowRecovery(s) && shouldShowLegacyOnboarding(s)).toBe(false);
    }
  });

  it("después de activar, volver a entrar NO fuerza el recovery otra vez", () => {
    // Mismo asesor: antes de activar vs después. El estado se deriva, no se
    // guarda, así que un logout/login no puede resucitar el recovery.
    const antes = deriveAdvisorState({ clientCount: 31, activationCount: 0, referralCount: 0 });
    const despues = deriveAdvisorState({ clientCount: 31, activationCount: 1, referralCount: 0 });
    expect(shouldShowRecovery(antes)).toBe(true);
    expect(shouldShowRecovery(despues)).toBe(false);
  });
});

describe("computeSetupProgress — progreso REAL, sin relleno", () => {
  it("marca solo lo que de verdad está configurado", () => {
    const p = computeSetupProgress({ clientCount: 4, hasProducts: false, hasTiers: true, hasChannel: false, activationCount: 0 });
    expect(p.find((x) => x.label.includes("clientes conectados"))?.done).toBe(true);
    expect(p.find((x) => x.label === "Productos que vendes")?.done).toBe(false);
    expect(p.find((x) => x.label === "Premios configurados")?.done).toBe(true);
    expect(p.find((x) => x.label === "Canal para activar")?.done).toBe(false);
    expect(p.find((x) => x.label === "Primera activación")?.done).toBe(false);
  });

  it("una cuenta vacía no muestra ningún paso hecho", () => {
    const p = computeSetupProgress({ clientCount: 0, hasProducts: false, hasTiers: false, hasChannel: false, activationCount: 0 });
    expect(p.every((x) => !x.done)).toBe(true);
  });
});

describe("suggestedFirstActivationSize — sugerencia, no regla", () => {
  it("cartera chica (<25): se sugieren todos", () => {
    expect(suggestedFirstActivationSize(4)).toBe(4);
    expect(suggestedFirstActivationSize(20)).toBe(20);
  });

  it("25–100: alrededor de 30 (nunca más que la cartera)", () => {
    expect(suggestedFirstActivationSize(31)).toBe(30);
    expect(suggestedFirstActivationSize(100)).toBe(30);
    expect(suggestedFirstActivationSize(26)).toBe(26);
  });

  it("100+: entre 30 y 50", () => {
    expect(suggestedFirstActivationSize(150)).toBe(30);
    expect(suggestedFirstActivationSize(250)).toBe(50);
    expect(suggestedFirstActivationSize(1000)).toBe(50);
  });

  it("nunca sugiere más clientes de los que hay", () => {
    for (const n of [1, 5, 24, 25, 60, 99, 120, 400]) {
      expect(suggestedFirstActivationSize(n)).toBeLessThanOrEqual(n);
    }
  });
});
