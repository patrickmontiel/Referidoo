import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import OwnerAsesoresPage from "../page";

function advisor(overrides: Record<string, unknown> = {}) {
  return {
    id: "adv1",
    name: "Eduardo Neri",
    email: "eduardo@referidoo.mx",
    plan: "freemium",
    emailVerified: true,
    createdAt: "2026-06-01",
    paidUntil: null,
    paymentFailedAt: null,
    mpPreapprovalId: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OwnerAsesoresPage", () => {
  it("renders the advisor table", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([advisor()]) })
    ) as unknown as typeof fetch);

    render(React.createElement(OwnerAsesoresPage));

    expect(await screen.findByText("Eduardo Neri")).toBeInTheDocument();
    expect(screen.getByText("Freemium")).toBeInTheDocument();
  });

  // Regresión: el .map() devolvía un <> (Fragment) sin key, con el key puesto
  // solo en el <tr> interno — React solo lo nota con 2+ filas ("Each child in
  // a list should have a unique key prop"). Detectado probando en navegador
  // real, no por los tests (1 solo asesor no lo dispara). Fix: Fragment con
  // key explícito envolviendo ambos <tr>.
  it("renders multiple advisors without a missing-key console warning (regression)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([advisor({ id: "adv1" }), advisor({ id: "adv2", name: "Ana Pérez" })]) })
    ) as unknown as typeof fetch);

    render(React.createElement(OwnerAsesoresPage));
    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();

    const keyWarning = consoleError.mock.calls.some((args) =>
      typeof args[0] === "string" && args[0].includes("unique")
    );
    expect(keyWarning).toBe(false);
    consoleError.mockRestore();
  });

  it("shows an error message when not authorized", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "No autorizado" }) })
    ) as unknown as typeof fetch);

    render(React.createElement(OwnerAsesoresPage));

    expect(await screen.findByText("No autorizado")).toBeInTheDocument();
  });

  it("expands the drill-down panel on row click, showing billing detail", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([advisor({ plan: "paid", paidUntil: "2026-07-24T12:00:00Z", mpPreapprovalId: "preapp_123" })]) })
    ) as unknown as typeof fetch);

    render(React.createElement(OwnerAsesoresPage));
    const row = await screen.findByText("Eduardo Neri");
    fireEvent.click(row.closest("tr")!);

    expect(await screen.findByText("preapp_123")).toBeInTheDocument();
    expect(screen.getByText(/24 jul 2026/i)).toBeInTheDocument();
  });

  it("toggles the plan without navigating the row click handler", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (!init) return Promise.resolve({ ok: true, json: () => Promise.resolve([advisor()]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(advisor({ plan: "paid" })) });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(React.createElement(OwnerAsesoresPage));
    const button = await screen.findByRole("button", { name: /pasar a pagado/i });
    fireEvent.click(button);

    expect(await screen.findByText("Pagado")).toBeInTheDocument();
  });
});
