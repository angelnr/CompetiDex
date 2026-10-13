import { test, expect } from "@playwright/test";

/**
 * Calculadora de daño: reproduce el fixture canónico de Smogon
 * (252 SpA Abomasnow Blizzard vs. 0 HP / 0 SpD Abomasnow -- guaranteed 2HKO).
 */
test.describe("Calculadora de daño", () => {
  test("calcula Abomasnow vs Abomasnow con notación Smogon", async ({ page }) => {
    await page.goto("/calculadora");
    await expect(page.getByRole("heading", { name: /calculadora de daño/i })).toBeVisible();

    const attacker = page.locator("section", { hasText: "Atacante" }).first();
    const defender = page.locator("section", { hasText: "Defensor" }).first();

    await attacker.getByRole("combobox", { name: "Especie" }).fill("abomasnow");
    await attacker.getByRole("button", { name: "Abomasnow" }).first().click();

    await defender.getByRole("combobox", { name: "Especie" }).fill("abomasnow");
    await defender.getByRole("button", { name: "Abomasnow" }).first().click();

    await attacker.getByRole("combobox", { name: "Movimiento 1" }).fill("blizzard");
    await attacker.getByRole("button", { name: "Blizzard" }).first().click();

    await expect(page.getByText(/guaranteed 2HKO/)).toBeVisible({ timeout: 20_000 });
  });
});
