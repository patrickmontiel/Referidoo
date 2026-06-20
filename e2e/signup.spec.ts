import { test, expect } from "@playwright/test";

test("self-serve signup: form → /admin → empty dashboard with verification banner", async ({ page }) => {
  const uniqueEmail = `e2e-${Date.now()}@referidoo-test.mx`;

  await page.goto("/registro");

  await page.getByLabel("Nombre completo").fill("Asesor E2E");
  await page.getByLabel("Correo electrónico").fill(uniqueEmail);
  await page.getByLabel("Contraseña").fill("password123");

  await page.getByRole("button", { name: /crear cuenta/i }).click();

  await page.waitForURL("**/admin");
  await expect(page.getByText(/verifica tu correo/i)).toBeVisible();
});

test("signup rejects a password shorter than 8 characters", async ({ page }) => {
  const uniqueEmail = `e2e-short-${Date.now()}@referidoo-test.mx`;

  await page.goto("/registro");
  await page.getByLabel("Nombre completo").fill("Asesor Corto");
  await page.getByLabel("Correo electrónico").fill(uniqueEmail);
  await page.getByLabel("Contraseña").fill("short");

  await page.getByRole("button", { name: /crear cuenta/i }).click();

  await expect(page.getByText(/8 caracteres/i)).toBeVisible();
  await expect(page).toHaveURL(/\/registro/);
});
