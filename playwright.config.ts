import { defineConfig, devices } from "@playwright/test";
import { E2E } from "./e2e/support/env";

/**
 * Pruebas de integración de punta a punta (frontend + backend + Postgres + Stripe en modo prueba).
 * `e2e/global-setup.ts` levanta todo por su cuenta; ver `e2e/README.md`.
 */
export default defineConfig({
    testDir: "./e2e",
    globalSetup: "./e2e/global-setup.ts",
    timeout: 120_000,
    expect: { timeout: 20_000 },
    fullyParallel: true,
    workers: process.env.CI ? 2 : 3,
    retries: process.env.CI ? 1 : 0,
    reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/.report" }]],
    outputDir: "e2e/.results",
    use: {
        baseURL: E2E.frontendUrl,
        locale: "es-MX",
        timezoneId: "America/Mexico_City",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        actionTimeout: 20_000,
        navigationTimeout: 45_000,
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
