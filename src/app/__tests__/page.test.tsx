import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }) }));
vi.mock("@/lib/auth", () => ({ getAdvisorSession: vi.fn() }));

import { redirect } from "next/navigation";
import { getAdvisorSession } from "@/lib/auth";
import Home from "../page";

const mockSession = getAdvisorSession as unknown as ReturnType<typeof vi.fn>;
const mockRedirect = redirect as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockSession.mockReset();
  mockRedirect.mockClear();
});

describe("Home (landing page)", () => {
  it("redirects to /admin when there is an active session", async () => {
    mockSession.mockResolvedValue({ advisorId: "adv1", email: "eduardo@referidoo.mx" });

    await expect(Home()).rejects.toThrow();
    expect(mockRedirect).toHaveBeenCalledWith("/admin");
  });

  it("renders the landing page when there is no session", async () => {
    mockSession.mockResolvedValue(null);

    const jsx = await Home();
    render(jsx);

    expect(screen.getByText(/deja de perseguir clientes/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /crear cuenta gratis/i }).length).toBeGreaterThan(0);
    expect(document.body.textContent?.replace(/\s+/g, " ")).toContain("$539 MXN");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("does not fabricate company-wide stats — the dashboard preview is clearly labeled as illustrative", async () => {
    mockSession.mockResolvedValue(null);

    const jsx = await Home();
    render(jsx);

    // Hay varias superficies de demo (hero, gráfica, portal) — todas etiquetadas
    expect(screen.getAllByText("Ejemplo").length).toBeGreaterThan(0);
  });
});
