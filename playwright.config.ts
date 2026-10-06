import { defineConfig, devices, type Project } from "@playwright/test";

const isCI = !!process.env.CI;
const baseURL = "http://localhost:4173";

// Only Chromium runs, on desktop and on a phone, to keep the suite fast and the
// screenshot baselines small. Screenshot-free journeys are tagged @smoke;
// select those separately when restoring other browser projects so they do
// not need a copy of Chromium's visual baselines.
const enabledProjects = new Set(["chromium", "mobile-chrome"]);
const mobileTests = /e2e-mobile(?:-gameplay)?\.test\.ts/;

const browserProjects: (Project & { name: string })[] = [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
    testIgnore: mobileTests,
  },
  {
    name: "firefox",
    use: { ...devices["Desktop Firefox"] },
    testIgnore: mobileTests, // Firefox doesn't support isMobile
  },
  {
    name: "webkit",
    use: { ...devices["Desktop Safari"] },
    timeout: 60000, // Webkit is slower, increase timeout from default 30s to 60s
    testIgnore: mobileTests,
  },
  // Mobile browsers
  {
    name: "mobile-chrome",
    use: { ...devices["Galaxy S24"] },
    testMatch: mobileTests,
  },
  {
    name: "mobile-safari",
    use: { ...devices["iPhone 14 Pro"] },
    testMatch: mobileTests,
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
