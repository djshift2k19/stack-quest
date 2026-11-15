import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

/**
 * Playwright drives a real browser like a robot user, to check the app
 * works end to end. It uses the Google Chrome already on this Mac
 * (channel: "chrome"), so no extra ~150 MB browser download is needed.
 *
 * It builds the app and runs the production version on port 3100.
 */
const PORT = 3100;

// Read the same local settings file the app reads, so tests know whether
// Supabase is set up (some tests only apply when it isn't).
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
