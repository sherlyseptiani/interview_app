import { defineConfig } from "@playwright/test";

const isContinuousIntegration = process.env["CI"] === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isContinuousIntegration,
  retries: isContinuousIntegration ? 2 : 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev",
    reuseExistingServer: !isContinuousIntegration,
    timeout: 120000,
    url: "http://localhost:3000"
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 720 }
      }
    }
  ]
});
