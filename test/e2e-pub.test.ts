import { test, expect, type Page, type Locator } from "@playwright/test";
import { IRIS_MS } from "../src/engine/constants";
import { advanceScene } from "./clock";

test.use({ viewport: { width: 1440, height: 1000 } });
// Include enough time for density-4 animation sampling in Linux WebKit.
test.setTimeout(90000);

async function advanceUntilVisible(page: Page, target: Locator) {
  for (let elapsed = 0; elapsed < 30000; elapsed += 500) {
    await advanceScene(page, 500);
    if (await target.isVisible()) break;
  }
  await expect(target).toBeVisible();
}

async function openPub(page: Page) {
  await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
  await page.goto("/");
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeVisible({
    timeout: 30000,
  });
  await page.waitForLoadState("networkidle");
  await page.clock.pauseAt(new Date("2030-01-01T00:01:00Z"));
  await page.keyboard.press("Space");
  await page.clock.runFor(1000);
  await expect(page.locator("[data-e2e=adventure-dialog]")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.clock.runFor(1000);
  await expect(page.locator("canvas[data-drawn=hall]")).toBeVisible();
  await page
    .locator('[data-e2e=hotspot][data-hotspot="exit:gate-london"]')
    .first()
    .click({ force: true });
  await advanceUntilVisible(page, page.locator("canvas[data-drawn=london]"));
  // data-drawn changes when the room loads, before its opening iris finishes.
  await advanceScene(page, IRIS_MS + 100);
}

/** The two bar guests, clear of the window rain and passing bus. */
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

/** Separate the body from its notes to verify both kinds of motion. */
async function jukeboxPixels(page: Page) {
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
    const d = canvas.width / 320;
    return [
      { x: 287, y: 79, w: 33, h: 46 },
      { x: 284, y: 50, w: 30, h: 23 },
    ].map(({ x, y, w, h }) =>
      Array.from(ctx.getImageData(x * d, y * d, w * d, h * d).data),
    );
  });
}

test("pub patrons drink while skills and the airport exit stay reachable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openPub(page);
  const before = await patronPixels(page);
  const moved = [false, false];
  const jukeboxBefore = await jukeboxPixels(page);
  const jukeboxMoved = [false, false];
  // Check several phases so a resting pose or quantized breath cannot alias
  // a complete loop back to its first frame.
  for (let i = 0; i < 16; i++) {
    await page.clock.runFor(400);
    const pixels = await patronPixels(page);
    for (let guest = 0; guest < moved.length; guest++) {
      moved[guest] ||= pixels[guest].some(
        (value, index) => value !== before[guest][index],
      );
    }
    const jukeboxNow = await jukeboxPixels(page);
    for (let area = 0; area < jukeboxMoved.length; area++) {
      jukeboxMoved[area] ||= jukeboxNow[area].some(
        (value, index) => value !== jukeboxBefore[area][index],
      );
    }
  }
  expect(moved).toEqual([true, true]);
  expect(jukeboxMoved).toEqual([true, true]);
  await expect(page.locator("[data-e2e=scene]")).toHaveScreenshot(
    "pub-patrons-drinking.png",
    { maxDiffPixelRatio: 0.02 },
  );

  await page
    .locator('[data-e2e=hotspot][data-hotspot="object:chalkboard"]')
    .first()
    .click({ force: true });
  await advanceUntilVisible(
    page,
    page.getByRole("dialog", { name: "Skills", exact: true }),
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("canvas[data-drawn=london]")).toBeVisible();
  await page
    .locator('[data-e2e=hotspot][data-hotspot="exit:door-hall"]')
    .first()
    .click({ force: true });
  await advanceUntilVisible(page, page.locator("canvas[data-drawn=hall]"));
});

test("pub patrons respect reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPub(page);
  const before = await patronPixels(page);
  const jukeboxBefore = await jukeboxPixels(page);
  await page.clock.runFor(16000);
  expect(await patronPixels(page)).toEqual(before);
  expect(await jukeboxPixels(page)).toEqual(jukeboxBefore);
  await expect(page.locator("[data-e2e=scene]")).toHaveScreenshot(
    "pub-patrons-reduced-motion.png",
    { maxDiffPixelRatio: 0.02 },
  );
});

test("the foreground table has paths behind and in front, and the jukebox responds", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPub(page);
  const scene = page.locator("[data-e2e=scene]");
  const canvas = page.locator("canvas[data-drawn=london]");

  await page
    .locator('[data-e2e=hotspot][data-hotspot="object:window"]')
    .first()
    .click({ force: true });
  await page.clock.runFor(15000);
  await expect(scene).toHaveScreenshot("pub-table-walk-behind.png", {
    maxDiffPixelRatio: 0.02,
  });

  await page
    .locator('[data-e2e=hotspot][data-hotspot="object:table"]')
    .first()
    .click({ force: true });
  await page.clock.runFor(18000);
  await expect(scene).toHaveScreenshot("pub-table-walk-in-front.png", {
    maxDiffPixelRatio: 0.02,
  });

  const jukebox = page
    .locator('[data-e2e=hotspot][data-hotspot="object:jukebox"]')
    .first();
  await jukebox.hover({ force: true });
  await expect(page.locator("[data-e2e=toolbar-status]")).toContainText(
    "jukebox",
  );
  await expect(
    page.locator('[data-e2e=hotspot][data-hotspot="object:fruit-machine"]'),
  ).toHaveCount(0);
  await jukebox.click({ force: true });
  // Step through the walk so the reply cannot start and finish between checks.
  let replied = false;
  for (let i = 0; i < 60 && !replied; i++) {
    await page.clock.runFor(500);
    replied = (await canvas.getAttribute("data-speaking")) === "true";
  }
  expect(replied).toBe(true);
  await page.clock.runFor(10000);

  await page
    .locator('[data-e2e=hotspot][data-hotspot="object:chalkboard"]')
    .first()
    .click({ force: true });
  await advanceUntilVisible(
    page,
    page.getByRole("dialog", { name: "Skills", exact: true }),
  );
  await page.keyboard.press("Escape");
  await expect(canvas).toBeVisible();
  await page
    .locator('[data-e2e=hotspot][data-hotspot="exit:door-hall"]')
    .first()
    .click({ force: true });
  await advanceUntilVisible(page, page.locator("canvas[data-drawn=hall]"));
});
