import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

// Keep the existing Chromium project name so the Linux baseline paths stay stable.
export default defineConfig({
  ...config,
  projects: config.projects
    ?.filter(({ name }) => name === "chromium")
    .map((project) => ({
      ...project,
      testMatch: /e2e-remaster\.test\.ts/,
      testIgnore: [],
    })),
});
