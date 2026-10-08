/**
 * Generate the OG image (public/{PROFILE.seo.ogImage}, 1200x630): a
 * screenshot of the real game, the airport hall with the travel-trunk toolbar.
 * The same capture supplies the README's scene image.
 *
 * Usage:
 *   npm run generate:og-image
 *
 * It builds the site and serves it on a free port (serve-build.ts), plays
 * the start of the game in Chromium, and waits for the Hall and dialogue to
 * render before syncing the capture to the plane and passenger animation:
 *
 * 1. the title card, then Space;
 * 2. the airport canvas and intro conversation, then Escape;
 * 3. Daniele's greeting to finish, so no speech covers the room;
 * 4. wait for the plane's second take-off and the passengers crossing the hall;
 * 5. walk Daniele to a clear patch of foreground, then face him south;
 * 6. clear the pointer and capture the scene.
 *
 * Capture the 1280x800 game without desktop chrome. Preserve the full scene
 * and toolbar in the 1200x630 social image with dark side padding.
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
const HALL_CAPTURE_AT_MS = 19000;
const CAPTURE_POSITION = { x: 225, y: 145 };

async function generateOGImage() {
  console.log("Generating OG image...\n");

  const site = await serveBuild();

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
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
    const hallStartedAt = Date.now();

    // The intro conversation talks over the Hall: skip it.
    const dialog = page.locator("[data-e2e=adventure-dialog]");
    await dialog.waitFor({ state: "visible", timeout: 10000 });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 10000 });

    // Let Daniele's airport greeting finish before taking the screenshot.
    const canvas = page.locator("canvas[data-drawn]");
    await page
      .locator('canvas[data-speaking="true"]')
      .waitFor({ timeout: 3000 })
      .catch(() => undefined);
    await canvas.and(page.locator('[data-speaking="false"]')).waitFor({
      timeout: 30000,
    });

    // Move Daniele clear of the crossing passengers, then take one southward
    // step so the character faces the viewer in the final image.
    const scene = page.locator("[data-e2e=scene][data-scene=hall]");
    const sceneBox = await scene.boundingBox();
    if (!sceneBox) throw new Error("The airport scene isn't on screen");
    const waitForPosition = async (x: number, y: number) => {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const value = await canvas.getAttribute("data-position");
        if (value) {
          const position = JSON.parse(value) as { x: number; y: number };
          if (
            Math.abs(position.x - x) < 0.01 &&
            Math.abs(position.y - y) < 0.01
          ) {
            return;
          }
        }
        await page.waitForTimeout(50);
      }
      throw new Error(`Daniele didn't reach the capture point at ${x}, ${y}`);
    };
    for (const y of [CAPTURE_POSITION.y - 3, CAPTURE_POSITION.y]) {
      await page.mouse.click(
        sceneBox.x + (CAPTURE_POSITION.x / 320) * sceneBox.width,
        sceneBox.y + (y / 160) * sceneBox.height,
      );
      await waitForPosition(CAPTURE_POSITION.x, y);
    }

    // The second take-off overlaps with several crossing passengers.
    await page.waitForTimeout(
      Math.max(0, HALL_CAPTURE_AT_MS - (Date.now() - hallStartedAt)),
    );
    await page.mouse.move(VIEWPORT.width - 1, VIEWPORT.height - 1);
    const shot = await page.locator("[data-e2e=game-canvas]").screenshot();
    await sharp(shot)
      .webp({ quality: 90 })
      .toFile(join(root, "docs/images/readme-airport.webp"));

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
    console.log("README image saved to: docs/images/readme-airport.webp");
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
