import { test, expect } from "@playwright/test";

/**
 * Flujo E2E canónico del AGENTS.md §5:
 *   home → búsqueda → ficha → navegación anterior/siguiente.
 *
 * Depende de Redis + PokeAPI en runtime. Si el entorno CI no tiene Redis,
 * el proxy cachea miss → fetch a pokeapi.co (necesita salida a internet).
 */
test.describe("Flujo home → búsqueda → ficha → navegación", () => {
  test("buscar Pikachu y navegar a su ficha, luego al siguiente Pokémon", async ({ page }) => {
    // 1. Home
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /CompetiDex/i })).toBeVisible();

    // 2. Buscar
    const search = page.getByLabel(/buscar pok/i);
    await search.fill("pikachu");
    // Esperamos a que aparezca la sugerencia
    const suggestion = page.getByRole("listbox").getByText(/pikachu/i);
    await expect(suggestion).toBeVisible({ timeout: 10_000 });
    await suggestion.click();

    // 3. Ficha de Pikachu
    await expect(page).toHaveURL(/\/pokemon\/pikachu$/);
    await expect(page).toHaveTitle(/Pikachu/i);

    // Datos visibles: PS, Ataque, Defensa (barras de stats)
    await expect(page.getByText(/^Pikachu$/).first()).toBeVisible();
    await expect(page.getByText(/^PS$/)).toBeVisible();
    await expect(page.getByText(/^Ataque$/)).toBeVisible();

    // Tipo Eléctrico
    await expect(page.getByText(/Eléctrico/i).first()).toBeVisible();

    // 4. Siguiente Pokémon (#26 Raichu)
    const nextLink = page.getByRole("link", { name: /siguiente/i });
    await nextLink.click();
    await expect(page).toHaveURL(/\/pokemon\/26$/);
    await expect(page.getByText(/^Raichu$/).first()).toBeVisible();

    // 5. Anterior vuelve a Pikachu (#25)
    const prevLink = page.getByRole("link", { name: /anterior/i });
    await prevLink.click();
    await expect(page).toHaveURL(/\/pokemon\/25$/);
  });

  test("navegar por ficha directa vía URL y comprobar secciones", async ({ page }) => {
    await page.goto("/pokemon/1");
    await expect(page).toHaveTitle(/Bulbasaur/i);

    // Secciones
    await expect(page.getByRole("heading", { name: /^Stats base$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Habilidades/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Efectividades defensivas/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Cadena evolutiva/i })).toBeVisible();
  });
});
