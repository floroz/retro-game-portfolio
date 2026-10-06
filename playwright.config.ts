import { defineConfig, devices, type Project } from "@playwright/test";

const isCI = !!process.env.CI;
const baseURL = "http://localhost:4173";

// Chromium keeps the full functional and visual suite. Other browser engines
// run only tagged gameplay journeys, without committed screenshot baselines.
const enabledProjects = new Set([
  "chromium",
  "mobile-chrome",
  "firefox",
  "webkit",
  "mobile-safari",
]);
const mobileTests = /e2e-mobile(?:-gameplay)?\.test\.ts/;

const browserProjects: (Project & { name: string })[] = [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
    testIgnore: mobileTests,
  },
  {
    name: "firefox",
    use: { ...devices["Desktop Firefox"], screenshot: "only-on-failure" },
    testMatch: /e2e-gameplay\.test\.ts/,
    grep: /@smoke/,
  },
  {
    name: "webkit",
    use: { ...devices["Desktop Safari"], screenshot: "only-on-failure" },
    timeout: 60000, // Webkit is slower, increase timeout from default 30s to 60s
    testMatch: /e2e-gameplay\.test\.ts/,
    grep: /@smoke/,
  },
  // Mobile browsers
  {
    name: "mobile-chrome",
    use: { ...devices["Galaxy S24"] },
    testMatch: mobileTests,
  },
  {
    name: "mobile-safari",
    use: { ...devices["iPhone 14 Pro"], screenshot: "only-on-failure" },
    timeout: 60000,
    testMatch: /e2e-mobile-gameplay\.test\.ts/,
    grep: /@smoke/,
  },
  {
    name: "tablet",
    use: { ...devices["iPad Pro 11"] },
    testMatch: mobileTests,
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
