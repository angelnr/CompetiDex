import { test, expect } from "@playwright/test";

/**
 * Smoke test del Home: título, buscador y bloque de ayuda.
 *
 * Ojo: el Home ya NO pinta un grid de cards; solo muestra la cabecera, la barra
 * de búsqueda y un texto de ayuda. Las cards viven en otras vistas.
 */
test.describe("Home", () => {
  test("muestra título y subtítulo de CompetiDex", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/CompetiDex/i);
    await expect(page.getByRole("heading", { name: /CompetiDex/i })).toBeVisible();
    await expect(page.getByText(/Pokédex all-in-one/i)).toBeVisible();
  });

  test("renderiza la barra de búsqueda con label accesible", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("combobox", { name: /buscar pokémon/i });
    await expect(search).toBeVisible();
  });

  test("muestra el bloque de ayuda con el número de Pokémon", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Busca cualquier Pokémon por nombre/i)).toBeVisible();
    await expect(page.getByText(/Más de 1000 Pokémon disponibles/i)).toBeVisible();
  });
});
