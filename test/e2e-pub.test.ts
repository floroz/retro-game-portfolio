import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1000 } });

// Reproduced on untouched V2 (c382110): Linux WebKit magnifies the art
// canvas 4x after the density-4 portrait update. Do not bless that as a baseline.
test.fixme(
  ({ browserName }) => browserName === "webkit",
  "Existing V2 canvas scaling fault in Linux WebKit (c382110).",
);

async function openPub(page: Page) {
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
  await page
    .locator('[data-e2e=hotspot][data-hotspot="exit:gate-london"]')
    .first()
    .click({ force: true });
  await page.clock.runFor(30000);
  await expect(page.locator("canvas[data-drawn=london]")).toBeVisible();
}

/** The two bar guests, clear of the window rain, bus and fruit-machine lamps. */
async function patronPixels(page: Page) {
  return page.locator("canvas[data-drawn=london]").evaluate((element) => {
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
    return [110, 222].map((x) =>
      Array.from(
        ctx.getImageData(x * density, 61 * density, 22 * density, 50 * density)
          .data,
      ),
    );
  });
}

test("pub patrons drink while skills and the airport exit stay reachable", async ({
  page,
}) => {
  // Firefox needs time to paint the full round trip under the test clock.
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openPub(page);
  const before = await patronPixels(page);
  const moved = [false, false];
  // Check several phases so a resting pose or quantized breath cannot alias
  // a complete loop back to its first frame.
  for (let i = 0; i < 8; i++) {
    await page.clock.runFor(800);
    const pixels = await patronPixels(page);
    for (let guest = 0; guest < moved.length; guest++) {
      moved[guest] ||= pixels[guest].some(
        (value, index) => value !== before[guest][index],
      );
    }
  }
  expect(moved).toEqual([true, true]);
  await expect(page.locator("[data-e2e=scene]")).toHaveScreenshot(
    "pub-patrons-drinking.png",
    { maxDiffPixelRatio: 0.02 },
  );

  await page
    .locator('[data-e2e=hotspot][data-hotspot="object:chalkboard"]')
    .first()
    .click({ force: true });
  await page.clock.runFor(15000);
  await expect(
    page.locator('[data-e2e=terminal-screen][data-action="skills"]'),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("canvas[data-drawn=london]")).toBeVisible();
  await page
    .locator('[data-e2e=hotspot][data-hotspot="exit:door-hall"]')
    .first()
    .click({ force: true });
  await page.clock.runFor(20000);
  await expect(page.locator("canvas[data-drawn=hall]")).toBeVisible();
});

test("pub patrons respect reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPub(page);
  const before = await patronPixels(page);
  await page.clock.runFor(16000);
  expect(await patronPixels(page)).toEqual(before);
  await expect(page.locator("[data-e2e=scene]")).toHaveScreenshot(
    "pub-patrons-reduced-motion.png",
    { maxDiffPixelRatio: 0.02 },
  );
});
