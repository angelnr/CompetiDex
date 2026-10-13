import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config para CompetiDex.
 *
 * - En local: `reuseExistingServer: true` => si ya hay `pnpm dev` corriendo
 *   en :3100, lo reutiliza; si no, lo levanta.
 * - En CI: arranca el server y espera `url` con timeout amplio.
 * - `outputDir` y `trace` configurados para diagnósticos en CI.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: `http://localhost:${process.env.PORT ?? "3100"}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    url: `http://localhost:${process.env.PORT ?? "3100"}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    ...(process.env.CI
      ? {
          env: {
            // En CI no hay Redis; el proxy cachea con fallback (lib/redis tolerate
            // el miss si REDIS_URL no responde gracias a retryPolicy).
            NODE_ENV: "production",
            REDIS_URL: process.env.REDIS_URL ?? "",
            DATABASE_URL: process.env.DATABASE_URL ?? "file:./ci-e2e.db",
            BETTER_AUTH_SECRET:
              process.env.BETTER_AUTH_SECRET ?? "ci-e2e-secret-not-for-production",
            BETTER_AUTH_URL: `http://localhost:${process.env.PORT ?? "3100"}`,
          },
        }
      : {}),
  },
});
