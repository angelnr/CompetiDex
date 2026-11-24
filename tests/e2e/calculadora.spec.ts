import { test, expect } from "@playwright/test";

/**
 * Calculadora de daño: flujo completo de UI (elegir atacante, defensor y
 * movimiento) y comprobación de que se calculan resultados.
 *
 * La corrección matemática exacta del fixture de Smogon
 * (252 SpA Abomasnow Blizzard vs. 0 HP / 0 SpD Abomasnow -- guaranteed 2HKO)
 * se valida en `lib/calc/engine.test.ts`, que es donde corresponde. Aquí solo
 * se comprueba que la pantalla se puede usar de principio a fin.
 */
test.describe("Calculadora de daño", () => {
  test("calcula daño con Abomasnow vs Abomasnow", async ({ page }) => {
    await page.goto("/calculadora");
    await expect(page.getByRole("heading", { name: /calculadora de daño/i })).toBeVisible();

    // Ojo: `hasText` es case-insensitive en Playwright, y el panel de
    // resultados vacío dice "Elige un atacante y un defensor…". Anclar por el
    // heading es la única forma de distinguir los paneles.
    const panel = (nombre: RegExp) =>
      page.locator("section").filter({ has: page.getByRole("heading", { name: nombre }) });

    const attacker = panel(/atacante/i);
    const defender = panel(/defensor/i);

    await expect(attacker).toHaveCount(1);
    await expect(defender).toHaveCount(1);

    // Atacante
    await attacker.getByRole("combobox", { name: "Especie" }).fill("abomasnow");
    await attacker.getByRole("option").first().click();

    // Defensor
    await defender.getByRole("combobox", { name: "Especie" }).fill("abomasnow");
    await defender.getByRole("option").first().click();

    // Movimiento (el nombre del movimiento se muestra localizado, así que
    // elegimos la primera sugerencia en vez de buscar por texto)
    const move = attacker.getByRole("combobox", { name: /movimiento 1/i });
    await move.fill("blizzard");
    const firstMove = attacker.getByRole("option").first();
    await expect(firstMove).toBeVisible({ timeout: 10_000 });
    await firstMove.click();

    // Se han calculado resultados
    await expect(page.getByRole("heading", { name: /resultados/i })).toBeVisible({
      timeout: 30_000,
    });
  });
});
