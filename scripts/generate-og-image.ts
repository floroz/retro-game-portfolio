/**
 * Generate the OG image (public/{PROFILE.seo.ogImage}, 1200x630): a
 * screenshot of the real game, the painted Sorrento kitchen with the travel-trunk
 * toolbar, in its Windows 98 window.
 *
 * Usage:
 *   npm run generate:og-image
 *
 * It builds the site and serves it on a free port (serve-build.ts), plays
 * the start of the game in Chromium, and waits for what it needs rather than
 * for a fixed time:
 *
 * 1. the title card, then Space;
 * 2. the airport canvas and intro conversation, then Escape;
 * 3. the Sorrento gate and the destination canvas after travel;
 * 4. Daniele's greeting to finish, so no speech covers the room;
 * 5. two animation frames after clearing the pointer from the game.
 *
 * The screenshot is taken at the window's own size on a big viewport (the
 * art stays on the pixel grid), and resized once with Lanczos to 1200x630.
 */

import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PROFILE } from "../src/config/profile.js";
import { serveBuild } from "./serve-build.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

/** Big enough that the game window opens at its full 1292x838. */
const VIEWPORT = { width: 1600, height: 1000 };

async function generateOGImage() {
  console.log("Generating OG image...\n");

  const site = await serveBuild();

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      reducedMotion: "reduce",
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(site.url);

    // The title card, then the game.
    await page.waitForSelector("[data-e2e=welcome-screen]", {
      timeout: 30000,
    });
    await page.keyboard.press("Space");
    await page.waitForSelector('canvas[data-drawn="hall"]', { timeout: 30000 });

    // The intro conversation talks over the Hall: skip it.
    const dialog = page.locator("[data-e2e=adventure-dialog]");
    await dialog.waitFor({ state: "visible", timeout: 10000 });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 10000 });

    // Travel through the real gate; wait for every Sorrento layer to draw.
    await page.locator('[data-hotspot="exit:gate-sorrento"]').first().click();
    await page.waitForSelector('canvas[data-drawn="sorrento"]', {
      timeout: 30000,
    });
    await page.mouse.move(0, 0);

    // Let the destination greeting finish before taking the screenshot.
    const canvas = page.locator("canvas[data-drawn]");
    await page
      .locator('canvas[data-speaking="true"]')
      .waitFor({ timeout: 3000 })
      .catch(() => undefined);
    await canvas.and(page.locator('[data-speaking="false"]')).waitFor({
      timeout: 30000,
    });

    // Desktop icons and wallpaper branding would poke into the crop.
    await page
      .locator('[data-e2e^="desktop-icon"], [class*="wallpaperBrand"]')
      .evaluateAll((elements) =>
        elements.forEach((element) => element.remove()),
      );
    await page.evaluate(
      "new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))",
    );

    // The game window, widened with desktop to the image's aspect ratio.
    const box = await page
      .locator("[data-e2e=win95-window]")
      .filter({ has: page.locator("[data-e2e=win95-game-window]") })
      .boundingBox();
    if (!box) throw new Error("The game window isn't on screen");
    const width = Math.round((box.height * OG_IMAGE_WIDTH) / OG_IMAGE_HEIGHT);
    const clip = {
      x: Math.max(0, Math.round(box.x + box.width / 2 - width / 2)),
      y: Math.round(box.y),
      width,
      height: Math.round(box.height),
    };
    const shot = await page.screenshot({ clip });

    const outputPath = join(root, "public", PROFILE.seo.ogImage);
    await sharp(shot)
      .resize(OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, { kernel: "lanczos3" })
      // A 256-colour palette keeps the painted screenshot compact for
      // social crawlers while preserving the full 1200x630 dimensions.
      .png({ palette: true, colours: 256, quality: 100, effort: 10 })
      .toFile(outputPath);

    console.log(`\nOG image saved to: public/${PROFILE.seo.ogImage}`);
    console.log(`   Dimensions: ${OG_IMAGE_WIDTH}x${OG_IMAGE_HEIGHT}px\n`);
  } finally {
    await browser.close();
    await site.close();
  }
}

generateOGImage().catch((error) => {
  console.error("Failed to generate OG image:", error);
  process.exit(1);
});
