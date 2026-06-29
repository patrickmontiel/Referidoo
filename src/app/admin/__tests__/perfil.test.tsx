import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import PerfilPage from "../perfil/page";

function mockAdvisorFetch(advisor: Record<string, unknown>) {
  vi.stubGlobal("fetch", vi.fn(() =>
    Promise.resolve({ json: () => Promise.resolve(advisor) })
  ) as unknown as typeof fetch);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PerfilPage", () => {
  it("renders account info from /api/advisor/me", async () => {
    mockAdvisorFetch({
      name: "Ana Pérez", email: "ana@x.com", phone: "55 1234 5678", companyName: "Despacho Ana",
      createdAt: "2026-06-01", plan: "freemium", emailVerified: true, paidUntil: null,
    });

    render(React.createElement(PerfilPage));

    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("ana@x.com")).toBeInTheDocument();
    expect(screen.getByText("Despacho Ana")).toBeInTheDocument();
  });

  it("shows the freemium upgrade CTA when plan=freemium and verified", async () => {
    mockAdvisorFetch({
      name: "Ana", email: "ana@x.com", phone: null, companyName: null,
      createdAt: "2026-06-01", plan: "freemium", emailVerified: true, paidUntil: null,
    });

    render(React.createElement(PerfilPage));

    expect(await screen.findByText(/hasta 2 clientes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /subir de plan/i })).toBeEnabled();
  });

  it("disables the upgrade CTA when the email is not verified", async () => {
    mockAdvisorFetch({
      name: "Ana", email: "ana@x.com", phone: null, companyName: null,
      createdAt: "2026-06-01", plan: "freemium", emailVerified: false, paidUntil: null,
    });

    render(React.createElement(PerfilPage));

    expect(await screen.findByText(/verifica tu correo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /subir de plan/i })).toBeDisabled();
  });

  // Regresión: no había ningún indicador permanente del estado de verificación
  // de correo — solo un banner temporal de 5s tras el link de verificación.
  // Un asesor que vuelve más tarde a /admin/perfil no tenía forma de confirmar
  // si su correo quedó verificado o no.
  it("shows a permanent 'Verificado' badge next to the email when verified", async () => {
    mockAdvisorFetch({
      name: "Ana", email: "ana@x.com", phone: null, companyName: null,
      createdAt: "2026-06-01", plan: "freemium", emailVerified: true, paidUntil: null,
    });

    render(React.createElement(PerfilPage));

    expect(await screen.findByText("Verificado")).toBeInTheDocument();
    expect(screen.queryByText("Sin verificar")).not.toBeInTheDocument();
  });

  it("shows a 'Sin verificar' badge next to the email when not verified", async () => {
    mockAdvisorFetch({
      name: "Ana", email: "ana@x.com", phone: null, companyName: null,
      createdAt: "2026-06-01", plan: "freemium", emailVerified: false, paidUntil: null,
    });

    render(React.createElement(PerfilPage));

    expect(await screen.findByText("Sin verificar")).toBeInTheDocument();
    expect(screen.queryByText("Verificado")).not.toBeInTheDocument();
  });

  it("shows the paid plan with next billing date and a cancel button", async () => {
    mockAdvisorFetch({
      name: "Ana", email: "ana@x.com", phone: null, companyName: null,
      createdAt: "2026-06-01", plan: "paid", emailVerified: true, paidUntil: "2026-07-23",
      monthlyPriceMxn: 539, pendingCommissionTotal: 0, pendingCommissions: [],
    });

    render(React.createElement(PerfilPage));

    expect(await screen.findByText(/plan pagado/i)).toBeInTheDocument();
    expect(screen.getAllByText(/próximo cobro/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /cancelar plan/i })).toBeInTheDocument();
  });

  it("shows the commission breakdown when there is pending commission", async () => {
    mockAdvisorFetch({
      name: "Ana", email: "ana@x.com", phone: null, companyName: null,
      createdAt: "2026-06-01", plan: "paid", emailVerified: true, paidUntil: "2026-07-23",
      monthlyPriceMxn: 539, pendingCommissionTotal: 150,
      pendingCommissions: [
        { id: "ref-1", leadName: "Juan López", productType: "auto", saleAmount: 5000, lessioCommission: 100, createdAt: "2026-06-10" },
        { id: "ref-2", leadName: "María Ruiz", productType: "vida", saleAmount: 3000, lessioCommission: 50, createdAt: "2026-06-15" },
      ],
    });

    render(React.createElement(PerfilPage));

    expect(await screen.findByText(/comisión por juan lópez/i)).toBeInTheDocument();
    expect(screen.getByText(/comisión por maría ruiz/i)).toBeInTheDocument();
    expect(screen.getByText("$689 MXN")).toBeInTheDocument();
  });

  it("shows an error message when cancel fails (no active MP subscription)", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === "/api/advisor/me") {
        return Promise.resolve({ json: () => Promise.resolve({
          name: "Ana", email: "ana@x.com", phone: null, companyName: null,
          createdAt: "2026-06-01", plan: "paid", emailVerified: true, paidUntil: "2026-07-23",
          monthlyPriceMxn: 539, pendingCommissionTotal: 0, pendingCommissions: [],
        }) });
      }
      if (url === "/api/billing/cancel" && init?.method === "POST") {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "No tienes una suscripción activa" }) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(React.createElement(PerfilPage));

    const cancelButton = await screen.findByRole("button", { name: /cancelar plan/i });
    cancelButton.click();

    const confirmButton = await screen.findByRole("button", { name: /confirmar/i });
    confirmButton.click();

    expect(await screen.findByText(/no tienes una suscripción activa/i)).toBeInTheDocument();
  });
});
