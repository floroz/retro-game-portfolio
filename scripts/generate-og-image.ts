/**
 * Generate OG Image using Playwright
 *
 * This script captures a screenshot of the OG image component
 * and saves it to public/og-image.png
 *
 * Usage:
 *   npm run generate:og-image
 *
 * Prerequisites:
 *   - Dev server must be running (npm run dev) OR
 *   - Script will start preview server automatically
 */

import { chromium } from "@playwright/test";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

async function generateOGImage() {
  console.log("🎨 Generating OG image...\n");

  // Try dev server first, then preview server
  const devUrl = "http://localhost:5173/?og-image=true";
  const previewUrl = "http://localhost:4173/?og-image=true";

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
    },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Try dev server first
  let url = devUrl;
  try {
    await page.goto(devUrl, { timeout: 5000 });
  } catch {
    console.log("Dev server not running, trying preview server...");
    url = previewUrl;
    try {
      await page.goto(previewUrl, { timeout: 5000 });
    } catch {
      console.error(
        "❌ Error: No server running. Please start the dev server with:\n",
      );
      console.error("   npm run dev\n");
      console.error("Or build and preview with:\n");
      console.error("   npm run build && npm run preview\n");
      await browser.close();
      process.exit(1);
    }
  }

  console.log(`📡 Connected to ${url}`);

  // Wait for the OG image component to render
  await page.waitForSelector(".og-image", { timeout: 10000 });

  // Small delay to ensure fonts and styles are fully loaded
  await page.waitForTimeout(500);

  // Take screenshot
  const outputPath = join(__dirname, "..", "public", "og-image.png");

  await page.screenshot({
    path: outputPath,
    clip: {
      x: 0,
      y: 0,
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
    },
  });

  console.log(`\n✅ OG image saved to: public/og-image.png`);
  console.log(`   Dimensions: ${OG_IMAGE_WIDTH}x${OG_IMAGE_HEIGHT}px\n`);

  await browser.close();
}

generateOGImage().catch((error) => {
  console.error("❌ Failed to generate OG image:", error);
  process.exit(1);
});
