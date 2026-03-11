import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  reporter: "list",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4176",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4176",
    port: 4176,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
