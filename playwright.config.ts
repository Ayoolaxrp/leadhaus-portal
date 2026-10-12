import { defineConfig, devices } from "@playwright/test";
import { E2E_PASSCODE } from "./e2e/passcode";

// Clicks through every feature in a real browser against a production build.
// Uses the installed Chrome, so no browser download is needed.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1, // demo data is shared, so tests run in order
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  use: { baseURL: "http://localhost:3300", channel: "chrome", screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" }, testIgnore: /mobile.spec.ts/ },
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: { command: process.env.E2E_SKIP_BUILD ? "npx next start -p 3300" : "npm run build && npx next start -p 3300", url: "http://localhost:3300/login", timeout: 600_000, reuseExistingServer: false, env: { AUTH_PROVIDER: "demo", DEMO_PASSCODE: E2E_PASSCODE, SESSION_SECRET: "e2e-only-session-secret-not-for-production" } },
});
