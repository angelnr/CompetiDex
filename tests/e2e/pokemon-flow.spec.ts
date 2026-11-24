import { test, expect } from "@playwright/test";

/**
 * Flujo E2E canónico del AGENTS.md §5:
 *   home → búsqueda → ficha → navegación anterior/siguiente.
 *
 * El catálogo del buscador se sirve por `/api/pokemon?offset=0&limit=1025`, que
 * en producción proxya PokeAPI. En CI eso es una dependencia externa: puede
 * tardar o devolver 429. Se intercepta con un fixture mínimo para que el test
 * sea determinista; la ficha sí se pide a la API real, que es lo que valida la
 * integración.
 */
const LIST_URL = /\/api\/pokemon\?offset=0&limit=1025/;

const CATALOG = {
  count: 3,
  next: null,
  previous: null,
  results: [
    { name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon/25/" },
    { name: "raichu", url: "https://pokeapi.co/api/v2/pokemon/26/" },
    { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" },
  ],
};

test.describe("Flujo home → búsqueda → ficha → navegación", () => {
  test("buscar Pikachu y navegar a su ficha, luego al siguiente Pokémon", async ({ page }) => {
    await page.route(LIST_URL, (route) => route.fulfill({ json: CATALOG }));

    // 1. Home
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /CompetiDex/i })).toBeVisible();

    // 2. Buscar
    await page.getByRole("combobox", { name: /buscar pokémon/i }).fill("pikachu");
    const suggestion = page.getByRole("option", { name: /pikachu/i }).first();
    await expect(suggestion).toBeVisible({ timeout: 15_000 });
    await suggestion.click();

    // 3. Ficha de Pikachu (las fichas se resuelven por id, con prefijo de idioma)
    await expect(page).toHaveURL(/\/pokemon\/25$/);
    await expect(page).toHaveTitle(/Pikachu/i);

    // Datos visibles: PS, Ataque (barras de stats)
    await expect(page.getByText(/^Pikachu$/).first()).toBeVisible();
    await expect(page.getByText(/^PS$/).first()).toBeVisible();
    await expect(page.getByText(/^Ataque$/).first()).toBeVisible();

    // Tipo Eléctrico
    await expect(page.getByText(/Eléctrico/i).first()).toBeVisible();

    // 4. Siguiente Pokémon (#26 Raichu)
    await page.getByRole("link", { name: /siguiente/i }).click();
    await expect(page).toHaveURL(/\/pokemon\/26$/);
    await expect(page.getByText(/^Raichu$/).first()).toBeVisible();

    // 5. Anterior vuelve a Pikachu (#25)
    await page.getByRole("link", { name: /anterior/i }).click();
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
