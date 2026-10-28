import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  webServer: [
    {
      command: "npm run start",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: false,
      env: { APP_MODE: "demo" },
    },
    {
      // Isolated live-mode instance. Provider credentials are intentionally absent,
      // so this verifies setup errors and that no demo data leaks into live mode.
      command: "npx next start --hostname 127.0.0.1 --port 3001",
      url: "http://127.0.0.1:3001/docs",
      reuseExistingServer: false,
      env: {
        APP_MODE: "live",
        APP_URL: "http://127.0.0.1:3001",
        AUTH_SECRET: "numora-e2e-session-secret-at-least-32-characters",
        AUTH_MAX_ATTEMPTS: "100",
        OPERATOR_PASSWORD_HASH:
          "scrypt$numora-e2e-fixture-salt$5fef72b63d79815e6ea30a270ec6255434d9cc991e992ddc3fb61828b22ecdafe4de60fc2c19881c17a8d9b63f47fa3a5c966d1e2750082a82eece79f28f0bf7",
      },
    },
  ],
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
