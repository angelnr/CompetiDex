import { test, expect } from "@playwright/test";

/**
 * Flujo de autenticación: registro (sin verificación de email por defecto),
 * creación de equipo persistente en BBDD y persistencia tras recargar.
 */
test.describe("Autenticación y equipos", () => {
  test("registro, crear equipo y persistencia tras recargar", async ({ page }) => {
    const email = `e2e-${Date.now()}@competidex.test`;

    await page.goto("/acceder");
    await page.getByRole("tab", { name: "Registrarse" }).click();

    await page.getByLabel("Nombre").fill("E2E Tester");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill("secret123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page).toHaveURL(/\/equipos/, { timeout: 15_000 });

    await page.getByLabel("Nombre del nuevo equipo").fill("Equipo E2E");
    await page.getByRole("button", { name: "Crear equipo" }).click();
    await expect(page.getByText("Equipo E2E")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Equipo E2E")).toBeVisible({ timeout: 15_000 });
  });
});
