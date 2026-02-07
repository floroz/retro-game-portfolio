import { mergeConfig } from "vite";
import viteConfig from "./vite.config";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default mergeConfig(
  viteConfig,

  defineConfig({
    test: {
      globals: true, // Enable global test APIs (describe, test, expect)
      setupFiles: ["./src/test/setup.ts"], // Global setup file

      projects: [
        {
          extends: true,
          test: {
            name: "unit-tests",
            environment: "happy-dom",
            include: ["src/**/*.test.{ts,tsx}"],
          },
        },
        {
          extends: true,
          test: {
            name: "browser",
            browser: {
              enabled: true,
              provider: playwright(),
              headless: true,
              // https://vitest.dev/config/browser/playwright
              instances: [{ browser: "chromium" }],
            },
            include: ["src/**/*.browser.test.{ts,tsx}"],
          },
        },
      ],

      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html", "lcov"],
        include: [
          "src/hooks/**/*.{ts,tsx}",
          "src/store/**/*.{ts,tsx}",
          "src/config/**/*.{ts,tsx}",
        ],
        exclude: [
          "**/*.test.{ts,tsx}",
          "**/*.browser.test.{ts,tsx}",
          "**/types/**",
          "**/__tests__/**",
          "**/test/**",
        ],
        thresholds: {
          lines: 70,
          functions: 70,
          branches: 65,
          statements: 70,
        },
      },
    },
  }),
);
