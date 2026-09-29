/**
 * Generate the OG image (public/{PROFILE.seo.ogImage}, 1200x630): a
 * screenshot of the real game, the painted Hall with the travel-trunk
 * toolbar, in its Win95 window.
 *
 * Usage:
 *   npm run generate:og-image
 *
 * It builds the site into a temporary folder, serves it on a free port
 * (Vite's preview server, `strictPort`, so it never clashes with a dev
 * server), plays the start of the game in Chromium, and waits for what it
 * needs rather than for a fixed time:
 *
 * 1. the title card, then Space;
 * 2. the canvas saying it has drawn the Hall (`data-drawn`, set by
 *    engine/render.ts once every image is in);
 * 3. the intro conversation opening, then Escape closing it;
 * 4. Daniele's greeting after it to finish (`data-speaking`), so no line of
 *    speech covers the room;
 * 5. two animation frames, so the screenshot is a frame drawn after all that.
 *
 * The screenshot is taken at the window's own size on a big viewport (the
 * art stays on the pixel grid), and resized once with Lanczos to 1200x630.
 */

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { build, preview } from "vite";
import { PROFILE } from "../src/config/profile.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

/** Big enough that the game window opens at its full 1292x838. */
const VIEWPORT = { width: 1600, height: 1000 };

/** A port nobody is listening on. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function generateOGImage() {
  console.log("Generating OG image...\n");

  // index.html is generated from profile.ts and not committed.
  if (!existsSync(join(root, "index.html"))) {
    execFileSync("npx", ["tsx", "scripts/generate-html.ts"], {
      cwd: root,
      stdio: "inherit",
    });
  }

  const outDir = mkdtempSync(join(tmpdir(), "og-image-"));
  const server = await (async () => {
    await build({
      root,
      logLevel: "warn",
      build: { outDir, emptyOutDir: true },
    });
    return preview({
      root,
      logLevel: "warn",
      build: { outDir },
      preview: { host: "127.0.0.1", port: await freePort(), strictPort: true },
    });
  })();
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error("The preview server has no URL");
  console.log(`Serving the build at ${url}`);

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(url);

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

    // Daniele then greets the visitor, once; let him finish.
    const canvas = page.locator("canvas[data-drawn]");
    await page
      .locator('canvas[data-speaking="true"]')
      .waitFor({ timeout: 3000 })
      .catch(() => undefined);
    await canvas.and(page.locator('[data-speaking="false"]')).waitFor({
      timeout: 30000,
    });

    // Desktop icons would poke into the crop.
    await page.addStyleTag({
      content: "[data-e2e^=desktop-icon]{visibility:hidden}",
    });
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
      // A 256-colour palette: the art is painted in few colours, and social
      // crawlers (WhatsApp's is about 300 KB) prefer a small file.
      .png({ palette: true, colours: 256, quality: 100, effort: 10 })
      .toFile(outputPath);

    console.log(`\nOG image saved to: public/${PROFILE.seo.ogImage}`);
    console.log(`   Dimensions: ${OG_IMAGE_WIDTH}x${OG_IMAGE_HEIGHT}px\n`);
  } finally {
    await browser.close();
    await server.close();
    rmSync(outDir, { recursive: true, force: true });
  }
}

generateOGImage().catch((error) => {
  console.error("Failed to generate OG image:", error);
  process.exit(1);
});
