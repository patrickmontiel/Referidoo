import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import AdminLayout from "../layout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("AdminLayout welcome screen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ name: "Eduardo Neri", onboardedAt: "2026-01-01T00:00:00.000Z" }) })
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
        React.createElement(AdminLayout, null, React.createElement("div", null, "content"))
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the verification banner when /api/advisor/me reports emailVerified=false", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ name: "Ana", emailVerified: false, onboardedAt: "2026-01-01T00:00:00.000Z" }) })
    ) as unknown as typeof fetch);

    render(React.createElement(AdminLayout, null, React.createElement("div", null, "content")));

    expect(await screen.findByText(/verifica tu correo/i)).toBeInTheDocument();
  });

  it("does not show the banner when emailVerified=true", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ name: "Eduardo Neri", emailVerified: true, onboardedAt: "2026-01-01T00:00:00.000Z" }) })
    ) as unknown as typeof fetch);

    render(React.createElement(AdminLayout, null, React.createElement("div", null, "content")));

    await act(async () => {});
    expect(screen.queryByText(/verifica tu correo/i)).not.toBeInTheDocument();
  });
});

describe("AdminLayout onboarding tour", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the onboarding tour when the advisor has never completed it (onboardedAt is null)", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ name: "Ana", emailVerified: true, onboardedAt: null }) })
    ) as unknown as typeof fetch);

    render(React.createElement(AdminLayout, null, React.createElement("div", null, "content")));

    expect(await screen.findByText(/bienvenido a referidoo/i)).toBeInTheDocument();
  });

  // Regresión: el estado "ya vio el tour" vivía solo en localStorage, así que
  // reaparecía en cualquier navegador/dispositivo nuevo aunque la cuenta ya
  // lo hubiera completado. Ahora se lee de onboardedAt en el servidor.
  it("does not show the onboarding tour when onboardedAt is already set, regardless of localStorage", async () => {
    localStorage.clear(); // explícitamente sin la bandera vieja de localStorage
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ name: "Ana", emailVerified: true, onboardedAt: "2026-01-01T00:00:00.000Z" }) })
    ) as unknown as typeof fetch);

    render(React.createElement(AdminLayout, null, React.createElement("div", null, "content")));

    await act(async () => {});
    expect(screen.queryByText(/bienvenido a referidoo/i)).not.toBeInTheDocument();
  });

  it("calls POST /api/advisor/onboarded when the tour is dismissed", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === "/api/advisor/onboarded") return Promise.resolve({ json: () => Promise.resolve({ ok: true }) });
      return Promise.resolve({ json: () => Promise.resolve({ name: "Ana", emailVerified: true, onboardedAt: null }) });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(React.createElement(AdminLayout, null, React.createElement("div", null, "content")));

    const skipButton = await screen.findByText(/saltar/i);
    skipButton.click();

    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledWith("/api/advisor/onboarded", { method: "POST" });
  });
});
