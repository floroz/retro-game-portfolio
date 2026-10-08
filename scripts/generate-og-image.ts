/**
 * Generate the OG image (public/{PROFILE.seo.ogImage}, 1200x630): a
 * screenshot of the real game, the painted Sorrento kitchen with the travel-trunk
 * toolbar. The same capture supplies the README's scene image.
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
 * 5. walk Daniele 30% left of the reference's x=205, keeping y=142,
 *    then approach that spot from above to face the viewer;
 * 6. clear the pointer and let the walking pose settle.
 *
 * Capture the 1280x800 game without desktop chrome. Preserve the full scene
 * and toolbar in the 1200x630 social image with dark side padding.
 */

import { chromium, expect } from "@playwright/test";
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
const REFERENCE_POSITION = { x: 205, y: 142 };
const CAPTURE_POSITION = {
  x: REFERENCE_POSITION.x * 0.7,
  y: REFERENCE_POSITION.y,
};

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

    // Use real floor clicks, finishing with a southward step so the rig faces
    // the viewer. Waiting on drawn coordinates verifies the requested pose.
    const scene = page.locator("[data-e2e=scene][data-scene=sorrento]");
    const sceneBox = await scene.boundingBox();
    if (!sceneBox) throw new Error("The Sorrento scene isn't on screen");
    for (const y of [CAPTURE_POSITION.y - 4, CAPTURE_POSITION.y]) {
      await page.mouse.click(
        sceneBox.x + (CAPTURE_POSITION.x / 320) * sceneBox.width,
        sceneBox.y + (y / 160) * sceneBox.height,
      );
      await expect
        .poll(
          async () => {
            const value = await canvas.getAttribute("data-position");
            if (!value) return false;
            const position = JSON.parse(value) as { x: number; y: number };
            return (
              Math.abs(position.x - CAPTURE_POSITION.x) < 0.01 &&
              Math.abs(position.y - y) < 0.01
            );
          },
          { timeout: 10000 },
        )
        .toBe(true);
    }
    await page.mouse.move(0, 0);
    // The rig blends from walking to idle over 160 ms.
    await page.waitForTimeout(200);
    const shot = await page.locator("[data-e2e=game-canvas]").screenshot();
    await sharp(shot)
      .webp({ quality: 90 })
      .toFile(join(root, "docs/images/readme-sorrento.webp"));

    const outputPath = join(root, "public", PROFILE.seo.ogImage);
    await sharp(shot)
      .resize(OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, {
        kernel: "lanczos3",
        fit: "contain",
        background: "#100b09",
      })
      // A 256-colour palette keeps the painted screenshot compact for
      // social crawlers while preserving the full 1200x630 dimensions.
      .png({ palette: true, colours: 256, quality: 100, effort: 10 })
      .toFile(outputPath);

    console.log(`\nOG image saved to: public/${PROFILE.seo.ogImage}`);
    console.log("README image saved to: docs/images/readme-sorrento.webp");
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
