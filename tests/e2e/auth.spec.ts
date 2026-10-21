import { PrismaClient } from "@prisma/client";
import { test, expect } from "@playwright/test";

/**
 * Flujo de autenticación: registro con verificación de email (simulada
 * marcando el usuario como verificado en la BBDD), login, creación de un
 * equipo persistente y persistencia tras recargar.
 */
test.describe("Autenticación y equipos", () => {
  test("registro verificado, login, crear equipo y persistencia", async ({ page }) => {
    const email = `e2e-${Date.now()}@competidex.test`;
    const password = "secret123";

    await page.goto("/acceder");
    await page.getByRole("tab", { name: "Registrarse" }).click();

    await page.getByLabel("Nombre").fill("E2E Tester");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    // Sin verificar el correo no hay sesión: se muestra el aviso.
    await expect(page.getByText(/verificación/i)).toBeVisible({ timeout: 15_000 });

    // Simula el clic del enlace del correo: marca el usuario como verificado.
    const prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL ?? "file:./dev.db" } },
    });
    try {
      await prisma.user.update({ where: { email }, data: { emailVerified: true } });
    } finally {
      await prisma.$disconnect();
    }

    // Ahora sí puede iniciar sesión.
    await page.getByRole("tab", { name: "Acceder" }).click();
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/equipos/, { timeout: 15_000 });

    await page.getByLabel("Nombre del nuevo equipo").fill("Equipo E2E");
    await page.getByRole("button", { name: "Crear equipo" }).click();
    await expect(page.getByText("Equipo E2E")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Equipo E2E")).toBeVisible({ timeout: 15_000 });
  });
});
