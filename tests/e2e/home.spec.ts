import { test, expect } from "@playwright/test";

/**
 * Smoke test del Home: grid y buscador se renderizan correctamente.
 * Assume que el dev server (o server de CI) está en :3100.
 *
 * El listado de Pokémon se carga en cliente (PokeAPI, con caché Redis). En CI
 * no hay Redis, así que la primera petición va a la API externa y puede tardar:
 * de ahí los timeouts amplios.
 */
const CARD_LINK = 'a[href*="/pokemon/"]';

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
    // Ojo: no usar getByRole("link").first(), que devuelve el enlace del logo.
    const firstCard = page.locator(CARD_LINK).first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });

    const href = await firstCard.getAttribute("href");
    expect(href).toMatch(/\/pokemon\/\d+/);
  });

  test("el grid renderiza varias cards de Pokémon", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator(CARD_LINK);
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });
    // El grid del Home lista más de un Pokémon; si solo hubiera uno, el
    // contenedor no se estaría pintando.
    expect(await cards.count()).toBeGreaterThan(1);
  });
});
