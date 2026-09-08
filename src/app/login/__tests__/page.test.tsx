import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import LoginPage from "../page";

describe("LoginPage — la contraseña NUNCA viene de la query string", () => {
  it("prellena el correo desde ?email pero ignora ?p (password)", async () => {
    window.history.replaceState({}, "", "/login?email=ana@demo.com&p=supersecret");
    render(<LoginPage />);

    // Espera a que el useEffect prellene el correo.
    const emailInput = await screen.findByDisplayValue("ana@demo.com");
    expect(emailInput).toBeTruthy();

    // La contraseña debe quedar VACÍA (no toma ?p).
    const passwordInput = screen.getByPlaceholderText("••••••••") as HTMLInputElement;
    expect(passwordInput.value).toBe("");

    // Y "supersecret" no aparece en ningún input.
    expect(screen.queryByDisplayValue("supersecret")).toBeNull();
  });
});
