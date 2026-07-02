import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import AdminLayoutShell from "../AdminLayoutShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function defaultProps(overrides: Partial<{
  initialAdvisorName: string;
  initialEmailVerified: boolean;
  initialPlan: string;
  initialOnboardedAt: string | null;
}> = {}) {
  return {
    initialAdvisorName: "Eduardo Neri",
    initialEmailVerified: true,
    initialPlan: "paid",
    initialOnboardedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderShell(props: ReturnType<typeof defaultProps>) {
  return render(
    React.createElement(AdminLayoutShell, props, React.createElement("div", null, "content"))
  );
}

describe("AdminLayout welcome screen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ plan: "paid" }) })
    ) as unknown as typeof fetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("hides the welcome overlay after its timers run, even under StrictMode's double-invoked effect", async () => {
    sessionStorage.setItem("referidoo_welcome", "1");

    const { container } = render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(AdminLayoutShell, defaultProps(), React.createElement("div", null, "content"))
      )
    );

    const findOverlay = () => container.querySelector(".z-\\[80\\]");
    expect(findOverlay()).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });

    expect(findOverlay()).toBeNull();
  });
});

describe("AdminLayout email verification banner", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ plan: "paid" }) })
    ) as unknown as typeof fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the verification banner when emailVerified=false", async () => {
    renderShell(defaultProps({ initialEmailVerified: false, initialAdvisorName: "Ana", initialPlan: "freemium" }));
    expect(await screen.findByText(/verifica tu correo/i)).toBeInTheDocument();
  });

  it("does not show the banner when emailVerified=true", async () => {
    renderShell(defaultProps({ initialEmailVerified: true }));
    await act(async () => {});
    expect(screen.queryByText(/verifica tu correo/i)).not.toBeInTheDocument();
  });
});

describe("AdminLayout onboarding tour", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ plan: "paid" }) })
    ) as unknown as typeof fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the onboarding tour when the advisor has never completed it (onboardedAt is null)", async () => {
    renderShell(defaultProps({ initialOnboardedAt: null, initialAdvisorName: "Ana" }));
    expect(await screen.findByText(/te damos la bienvenida/i)).toBeInTheDocument();
  });

  // Regresión: el estado "ya vio el tour" vivía solo en localStorage, así que
  // reaparecía en cualquier navegador/dispositivo nuevo aunque la cuenta ya
  // lo hubiera completado. Ahora se lee de onboardedAt en el servidor.
  it("does not show the onboarding tour when onboardedAt is already set, regardless of localStorage", async () => {
    localStorage.clear();
    renderShell(defaultProps({ initialOnboardedAt: "2026-01-01T00:00:00.000Z", initialAdvisorName: "Ana" }));
    await act(async () => {});
    expect(screen.queryByText(/te damos la bienvenida/i)).not.toBeInTheDocument();
  });

  it("calls POST /api/advisor/onboarded when the tour is dismissed", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/advisor/onboarded") return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ plan: "freemium" }) });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    renderShell(defaultProps({ initialOnboardedAt: null, initialAdvisorName: "Ana", initialPlan: "freemium" }));

    const skipButton = await screen.findByRole("button", { name: /saltar el recorrido/i });
    skipButton.click();

    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledWith("/api/advisor/onboarded", { method: "POST" });
  });
});
