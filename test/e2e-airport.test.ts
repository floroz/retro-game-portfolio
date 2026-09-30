import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1000 } });

async function openAirport(page: Page) {
  await page.goto("/");
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeVisible({
    timeout: 30000,
  });
  await page.keyboard.press("Space");
  await expect(page.locator("[data-e2e=adventure-dialog]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("canvas[data-drawn=hall]")).toBeVisible();
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
}

/** Only the seated heads: excludes Daniele, the plane, and the crossing lanes. */
async function seatedPixels(page: Page) {
  return page.locator("canvas[data-drawn=hall]").evaluate((element) => {
    const canvas = element as unknown as {
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
    return Array.from(ctx.getImageData(342, 164, 108, 26).data);
  });
}

test("airport passengers breathe and walk across the lounge", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openAirport(page);
  const before = await seatedPixels(page);
  await page.clock.runFor(2300);
  expect(await seatedPixels(page)).not.toEqual(before);
  await page.clock.runFor(13500);
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
