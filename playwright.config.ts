import { defineConfig } from "@playwright/test"

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:4173"

export default defineConfig({
  testDir: "e2e",
  timeout: 60000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    screenshot: "only-on-failure",
  },
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: "npm run preview",
          port: 4173,
          reuseExistingServer: !process.env.CI,
        },
      }),
})
