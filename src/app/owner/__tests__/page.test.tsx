import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import OwnerResumenPage from "../page";

const baseOverview = {
  monthLabel: "jul 2026",
  periodLabel: "en julio",
  mrr: 539,
  mrrNew: 539,
  proCount: 1,
  freemiumCount: 6,
  activeCount: 7,
  commissionTotal: 1416,
  commissionSince: "2026-06-24",
  conversionsCount: 5,
  salesValue: 188400,
  weekly: [],
  weeklyHasData: false,
  products: [],
  ranking: [
    {
      id: "a1",
      name: "Eduardo Neri",
      plan: "paid",
      leads: 9,
      converted: 2,
      commission: 1398,
      lastCloseAt: new Date().toISOString(),
    },
  ],
  problems: [{ id: "p1", title: "Cobro de suscripción rechazado", detail: "detalle" }],
  activity: [],
};

function mockOverviewFetch(overview: Record<string, unknown>) {
  vi.stubGlobal("fetch", vi.fn(() =>
    Promise.resolve({ json: () => Promise.resolve(overview) })
  ) as unknown as typeof fetch);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OwnerResumenPage", () => {
  it("renders MRR, commission, ranking and problems from the overview", async () => {
    mockOverviewFetch(baseOverview);

    render(React.createElement(OwnerResumenPage));

    expect(await screen.findByText("$539")).toBeInTheDocument();
    expect(screen.getByText("$1,416")).toBeInTheDocument();
    expect(screen.getByText("Eduardo Neri")).toBeInTheDocument();
    expect(screen.getByText("Cobro de suscripción rechazado")).toBeInTheDocument();
    expect(screen.getByText(/1 asesor en Pro/)).toBeInTheDocument();
  });

  it("shows an error message when the overview fails to load", async () => {
    mockOverviewFetch({ error: "No autorizado" });

    render(React.createElement(OwnerResumenPage));

    expect(await screen.findByText(/no se pudo cargar el resumen/i)).toBeInTheDocument();
  });
});
