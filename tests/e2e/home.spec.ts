import { test, expect } from "@playwright/test";

/**
 * Smoke test del Home: grid y buscador se renderizan correctamente.
 * Assume que el dev server (o server de CI) está en :3100.
 */
test.describe("Home", () => {
  test("muestra título y descripción de CompetiDex", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/CompetiDex/i);
    await expect(page.getByRole("heading", { name: /CompetiDex/i })).toBeVisible();
  });

  test("renderiza la barra de búsqueda con label accesible", async ({ page }) => {
    await page.goto("/");
    const search = page.getByLabel(/buscar pok/i);
    await expect(search).toBeVisible();
    await expect(search).toHaveAttribute("type", "search");
  });

  test("renderiza al menos una card de Pokémon tras hidratar", async ({ page }) => {
    await page.goto("/");
    // Las cards son Links a /pokemon/{id}
    const firstCard = page.getByRole("link").first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    // El href debe apuntar a una ficha
    const href = await firstCard.getAttribute("href");
    expect(href).toMatch(/\/pokemon\/\d+/);
  });

  test("el grid existe con clase grid-cols", async ({ page }) => {
    await page.goto("/");
    const grid = page.locator(".grid.grid-cols-2").first();
    await expect(grid).toBeVisible({ timeout: 15_000 });
  });
});
