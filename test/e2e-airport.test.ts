import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1000 } });

// Reproduced on untouched V2 (c382110): Linux WebKit magnifies the art
// canvas 4x after the density-4 portrait update. Do not bless that as a baseline.
test.fixme(
  ({ browserName }) => browserName === "webkit",
  "Existing V2 canvas scaling fault in Linux WebKit (c382110).",
);

async function openAirport(page: Page) {
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeVisible({
    timeout: 30000,
  });
  await page.keyboard.press("Space");
  await expect(page.locator("[data-e2e=adventure-dialog]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("canvas[data-drawn=hall]")).toBeVisible();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
}

/** Only the seated heads: excludes Daniele, the plane, and the crossing lanes. */
async function seatedPixels(page: Page) {
  return page.locator("canvas[data-drawn=hall]").evaluate((element) => {
    const canvas = element as unknown as {
      width: number;
      getContext(kind: string): {
        getImageData(
          x: number,
          y: number,
          w: number,
          h: number,
        ): { data: ArrayLike<number> };
      };
    };
    const ctx = canvas.getContext("2d");
    const density = canvas.width / 320;
    return Array.from(
      ctx.getImageData(171 * density, 82 * density, 54 * density, 13 * density)
        .data,
    );
  });
}

test("airport passengers breathe and walk across the lounge", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openAirport(page);
  const before = await seatedPixels(page);
  // Sample across a whole breathing cycle: two isolated samples can land
  // on the same quantized pixel offset even while the passengers move.
  let moved = false;
  for (let i = 0; i < 6; i++) {
    await page.clock.runFor(650);
    const pixels = await seatedPixels(page);
    moved ||= pixels.some((value, index) => value !== before[index]);
  }
  expect(moved).toBe(true);
  await page.clock.runFor(11900);
  await expect(page.locator("[data-e2e=scene]")).toHaveScreenshot(
    "airport-passengers-walking.png",
    { maxDiffPixelRatio: 0.02 },
  );
  // The moving decoration never steals the gate's click target.
  await page
    .locator('[data-e2e=hotspot][data-hotspot="exit:gate-london"]')
    .first()
    .click({ force: true });
  await page.clock.runFor(30000);
  await expect(page.locator("canvas[data-drawn=london]")).toBeVisible();
});

test("airport passengers respect reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openAirport(page);
  const before = await seatedPixels(page);
  await page.clock.runFor(16000);
  expect(await seatedPixels(page)).toEqual(before);
  await expect(page.locator("[data-e2e=scene]")).toHaveScreenshot(
    "airport-passengers-reduced-motion.png",
    { maxDiffPixelRatio: 0.02 },
  );
});
