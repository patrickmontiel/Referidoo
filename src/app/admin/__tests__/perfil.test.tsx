import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import PerfilClient from "../perfil/PerfilClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("@/components/UpgradeCardForm", () => ({
  UpgradeCardForm: () => React.createElement("div", null, "upgrade-form"),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

function baseAdvisor(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ana Pérez",
    email: "ana@x.com",
    phone: "55 1234 5678",
    companyName: "Despacho Ana",
    createdAt: "2026-06-01T00:00:00.000Z",
    plan: "freemium",
    emailVerified: true,
    paidUntil: null,
    monthlyPriceMxn: 539,
    pendingCommissionTotal: 0,
    pendingCommissions: [],
    ...overrides,
  };
}

function renderPerfil(advisorOverrides: Record<string, unknown> = {}, clientCount = 0, leadCount = 0) {
  return render(
    React.createElement(PerfilClient, {
      initialAdvisor: baseAdvisor(advisorOverrides),
      initialClientCount: clientCount,
      initialLeadCount: leadCount,
    })
  );
}

describe("PerfilPage", () => {
  it("renders account info", async () => {
    renderPerfil();

    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("ana@x.com")).toBeInTheDocument();
    expect(screen.getByText(/despacho ana/i)).toBeInTheDocument();
  });

  it("shows the freemium upgrade CTA when plan=freemium and verified", async () => {
    renderPerfil({ plan: "freemium", emailVerified: true });

    expect(await screen.findByText(/hasta 12 leads/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /subir a plan pro/i })).toBeEnabled();
  });

  it("shows the verification warning inside the plan section when email is not verified", async () => {
    renderPerfil({ plan: "freemium", emailVerified: false });

    expect(await screen.findByText(/verifica tu correo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /subir a plan pro/i })).toBeInTheDocument();
  });

  // Regresión: no había ningún indicador permanente del estado de verificación
  // de correo — solo un banner temporal de 5s tras el link de verificación.
  // Un asesor que vuelve más tarde a /admin/perfil no tenía forma de confirmar
  // si su correo quedó verificado o no.
  it("shows a permanent 'Verificado' badge next to the email when verified", async () => {
    renderPerfil({ emailVerified: true });

    expect(await screen.findByText("Verificado")).toBeInTheDocument();
    expect(screen.queryByText("Sin verificar")).not.toBeInTheDocument();
  });

  it("shows a 'Sin verificar' badge next to the email when not verified", async () => {
    renderPerfil({ emailVerified: false });

    expect(await screen.findByText("Sin verificar")).toBeInTheDocument();
    expect(screen.queryByText("Verificado")).not.toBeInTheDocument();
  });

  it("shows the paid plan with next billing date and a manage button", async () => {
    renderPerfil({
      plan: "paid",
      emailVerified: true,
      paidUntil: "2026-07-23T00:00:00.000Z",
      monthlyPriceMxn: 539,
      pendingCommissionTotal: 0,
      pendingCommissions: [],
    });

    expect(await screen.findByText(/plan pro/i)).toBeInTheDocument();
    expect(screen.getAllByText(/próximo cobro/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /gestionar suscripción/i })).toBeInTheDocument();
  });

  it("shows the commission breakdown when there is pending commission", async () => {
    renderPerfil({
      plan: "paid",
      emailVerified: true,
      paidUntil: "2026-07-23T00:00:00.000Z",
      monthlyPriceMxn: 539,
      pendingCommissionTotal: 150,
      pendingCommissions: [
        { id: "ref-1", leadName: "Juan López", productType: "auto", saleAmount: 5000, lessioCommission: 100, createdAt: "2026-06-10" },
        { id: "ref-2", leadName: "María Ruiz", productType: "vida", saleAmount: 3000, lessioCommission: 50, createdAt: "2026-06-15" },
      ],
    });

    expect(await screen.findByText(/juan lópez/i)).toBeInTheDocument();
    expect(screen.getByText(/maría ruiz/i)).toBeInTheDocument();
    expect(screen.getByText("$689 MXN")).toBeInTheDocument();
  });

  it("shows an error message when cancel fails (no active MP subscription)", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === "/api/billing/cancel" && init?.method === "POST") {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "No tienes una suscripción activa" }) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    renderPerfil({
      plan: "paid",
      emailVerified: true,
      paidUntil: "2026-07-23T00:00:00.000Z",
      monthlyPriceMxn: 539,
      pendingCommissionTotal: 0,
      pendingCommissions: [],
    });

    const manageButton = await screen.findByRole("button", { name: /gestionar suscripción/i });
    manageButton.click();

    const confirmButton = await screen.findByRole("button", { name: /confirmar/i });
    confirmButton.click();

    expect(await screen.findByText(/no tienes una suscripción activa/i)).toBeInTheDocument();
  });
});
