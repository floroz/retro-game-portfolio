import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const baseURL = "http://localhost:4173";

export default defineConfig({
  testDir: "./test",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    contextOptions: {
      reducedMotion: "reduce",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /e2e-mobile\.test\.ts/, // Skip mobile tests for desktop browser
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testIgnore: /e2e-mobile\.test\.ts/, // Firefox doesn't support isMobile
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: /e2e-mobile\.test\.ts/, // Skip mobile tests for desktop browser
    },
    // Mobile browsers
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
      },
      testMatch: /e2e-mobile\.test\.ts/, // Only run mobile tests
    },
    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 12"],
      },
      testMatch: /e2e-mobile\.test\.ts/, // Only run mobile tests
    },
    {
      name: "tablet",
      use: {
        ...devices["iPad Pro 11"],
      },
      testMatch: /e2e-mobile\.test\.ts/, // Only run mobile tests
    },
  ],
  webServer: {
    command:
      "npm run generate:html && VITE_TYPEWRITER_SPEED=0 npx vite build && npm run preview",
    url: baseURL,
    reuseExistingServer: !isCI,
  },
});
