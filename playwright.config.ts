import { defineConfig, devices, type Project } from "@playwright/test";

const isCI = !!process.env.CI;
const baseURL = "http://localhost:4173";

// Only Chromium runs, on desktop and on a phone, to keep the suite fast and the
// screenshot baselines small. To bring another browser back, add its name here,
// write its baselines with `npm run test:e2e:docker:update -- --project=<name>`,
// and commit the new `*-linux.png` files.
const enabledProjects = new Set(["chromium", "mobile-chrome"]);

const browserProjects: (Project & { name: string })[] = [
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
    timeout: 60000, // Webkit is slower, increase timeout from default 30s to 60s
    testIgnore: /e2e-mobile\.test\.ts/, // Skip mobile tests for desktop browser
  },
  // Mobile browsers
  {
    name: "mobile-chrome",
    use: { ...devices["Galaxy S24"] },
    testMatch: /e2e-mobile\.test\.ts/, // Only run mobile tests
  },
  {
    name: "mobile-safari",
    use: { ...devices["iPhone 14 Pro"] },
    testMatch: /e2e-mobile\.test\.ts/, // Only run mobile tests
  },
  {
    name: "tablet",
    use: { ...devices["iPad Pro 11"] },
    testMatch: /e2e-mobile\.test\.ts/, // Only run mobile tests
  },
];

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
  projects: browserProjects.filter(({ name }) => enabledProjects.has(name)),
  webServer: {
    command: "npm run generate:html && npx vite build && npm run preview",
    url: baseURL,
    reuseExistingServer: !isCI,
  },
});
