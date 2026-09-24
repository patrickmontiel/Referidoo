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
      Promise.resolve({ ok: true, json: () => Promise.resolve({ advisors: [advisor()], nextCursor: null }) })
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
      Promise.resolve({ ok: true, json: () => Promise.resolve({ advisors: [advisor({ id: "adv1" }), advisor({ id: "adv2", name: "Ana Pérez" })], nextCursor: null }) })
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
      Promise.resolve({ ok: true, json: () => Promise.resolve({ advisors: [advisor({ plan: "paid", paidUntil: "2026-07-24T12:00:00Z", mpPreapprovalId: "preapp_123" })], nextCursor: null }) })
    ) as unknown as typeof fetch);

    render(React.createElement(OwnerAsesoresPage));
    const row = await screen.findByText("Eduardo Neri");
    fireEvent.click(row.closest("tr")!);

    expect(await screen.findByText("preapp_123")).toBeInTheDocument();
    expect(screen.getByText(/24 jul 2026/i)).toBeInTheDocument();
  });

  // Subir a Pro pide vigencia (30 / 90 días / 1 año) en lugar de un "Confirmar"
  // seco: el servidor tiene que escribir un `paidUntil`, porque un "paid" sin
  // fecha de corte lo revierte el cron de billing-downgrade.
  it("regala Pro mandando los días elegidos, sin navegar por el click de la fila", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (!init) return Promise.resolve({ ok: true, json: () => Promise.resolve({ advisors: [advisor()], nextCursor: null }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(advisor({ plan: "paid" })) });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(React.createElement(OwnerAsesoresPage));
    fireEvent.click(await screen.findByRole("button", { name: /pasar a pagado/i }));

    // El diálogo del upgrade ofrece vigencias, no un confirmar genérico.
    fireEvent.click(await screen.findByRole("button", { name: /^30 días$/i }));

    const patchCall = fetchMock.mock.calls.find((c) => c[1]?.method === "PATCH");
    expect(patchCall).toBeDefined();
    expect(JSON.parse(patchCall![1]!.body as string)).toEqual({ plan: "paid", compDays: 30 });

    // Sin suscripción de MP es un regalo, y la tabla lo dice para no leerlo
    // como ingreso.
    expect(await screen.findByText("Pro de regalo")).toBeInTheDocument();
  });

  it("una suscripción real de MP se muestra como Pagado, no como regalo", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          advisors: [advisor({ plan: "paid", mpPreapprovalId: "mp-123" })],
          nextCursor: null,
        }),
      })
    ) as unknown as typeof fetch);

    render(React.createElement(OwnerAsesoresPage));
    expect(await screen.findByText("Pagado")).toBeInTheDocument();
    expect(screen.queryByText("Pro de regalo")).not.toBeInTheDocument();
  });

  it("bajar a freemium sigue pidiendo una sola confirmación", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (!init) return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ advisors: [advisor({ plan: "paid" })], nextCursor: null }),
      });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(advisor({ plan: "freemium" })) });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(React.createElement(OwnerAsesoresPage));
    fireEvent.click(await screen.findByRole("button", { name: /pasar a freemium/i }));
    fireEvent.click(await screen.findByRole("button", { name: /confirmar baja/i }));

    const patchCall = fetchMock.mock.calls.find((c) => c[1]?.method === "PATCH");
    expect(JSON.parse(patchCall![1]!.body as string)).toEqual({ plan: "freemium" });
  });
});
