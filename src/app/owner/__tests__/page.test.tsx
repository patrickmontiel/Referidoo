import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import OwnerResumenPage from "../page";

function mockSummaryFetch(summary: Record<string, unknown>) {
  vi.stubGlobal("fetch", vi.fn(() =>
    Promise.resolve({ json: () => Promise.resolve(summary) })
  ) as unknown as typeof fetch);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OwnerResumenPage", () => {
  it("renders MRR and commission totals with the since-date caveat", async () => {
    mockSummaryFetch({ mrr: 1617, paidAdvisorsCount: 3, lessioCommissionTotal: 240, lessioCommissionSince: "2026-06-24" });

    render(React.createElement(OwnerResumenPage));

    expect(await screen.findByText("$1,617")).toBeInTheDocument();
    expect(screen.getByText("$240")).toBeInTheDocument();
    expect(screen.getByText(/3 asesor\(es\) en plan pagado/)).toBeInTheDocument();
    expect(screen.getAllByText(/desde/i).length).toBeGreaterThan(0);
  });

  it("shows an error message when the summary fails to load", async () => {
    mockSummaryFetch({ error: "No autorizado" });

    render(React.createElement(OwnerResumenPage));

    expect(await screen.findByText(/no se pudo cargar el resumen/i)).toBeInTheDocument();
  });
});
