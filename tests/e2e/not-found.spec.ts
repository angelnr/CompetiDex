import { test, expect } from "@playwright/test";

/**
 * Verifica que una ficha inexistente devuelve 404 (PokeAPI upstream 404
 * propagado por el proxy y page.tsx vía `notFound()`).
 */
test.describe("404 en ficha inexistente", () => {
  test("Pokemon con id imposiblemente alto devuelve 404", async ({ page }) => {
    const response = await page.goto("/pokemon/99999999");
    expect(response?.status()).toBe(404);
  });

  test("Pokemon con id no numérico devuelve 404", async ({ page }) => {
    const response = await page.goto("/pokemon/abc-not-real");
    expect(response?.status()).toBe(404);
  });
});
