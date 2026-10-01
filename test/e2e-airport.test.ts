import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
import { advanceScene } from "./clock";

test.use({ viewport: { width: 1440, height: 1000 } });
// Density-4 animation sampling is expensive in Linux WebKit.
test.setTimeout(90000);

async function openAirport(page: Page) {
  await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
  await page.goto("/");
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeVisible({
    timeout: 30000,
  });
  // Finish loading art, then freeze before the scene mounts. Freezing after
  // entering the lounge let real loading time change the passengers' phase.
  await page.waitForLoadState("networkidle");
  await page.clock.pauseAt(new Date("2030-01-01T00:01:00Z"));
  await page.keyboard.press("Space");
  await page.clock.runFor(1000);
  await expect(page.locator("[data-e2e=adventure-dialog]")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.clock.runFor(1000);
  await expect(page.locator("canvas[data-drawn=hall]")).toBeVisible();
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

test("scene pixels keep their geometry across repeated frames", async ({
  page,
}) => {
  await openAirport(page);
  // Clear floor landmarks, away from passengers, labels and the character.
  // Compare against the actual source art so an intended palette change does
  // not turn this geometry regression into a second screenshot baseline.
  const points = [
    { x: 40, y: 145 },
    { x: 160, y: 150 },
    { x: 240, y: 150 },
  ];
  const { data, info } = await sharp("src/assets/remaster/hall/bg.png")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const density = info.width / 320;
  const expected = points.map(({ x, y }) => {
    const offset = (y * density * info.width + x * density) * 4;
    return Array.from(data.subarray(offset, offset + 4));
  });
  for (let frame = 0; frame < 3; frame++) {
    await page.clock.runFor(4000);
    const actual = await page
      .locator("canvas[data-drawn=hall]")
      .evaluate((element, landmarks) => {
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
        const scale = canvas.width / 320;
        return landmarks.map(({ x, y }) =>
          Array.from(
            canvas.getContext("2d").getImageData(x * scale, y * scale, 1, 1)
              .data,
          ),
        );
      }, points);
    expect(actual).toEqual(expected);
  }
});

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
  const london = page.locator("canvas[data-drawn=london]");
  // Stop advancing once travel finishes instead of rendering thousands of
  // unrelated London frames before asserting that the gate worked.
  for (let elapsed = 0; elapsed < 30000; elapsed += 1000) {
    await advanceScene(page, 1000);
    if (await london.isVisible()) break;
  }
  await expect(london).toBeVisible();
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

test("Daniele's ground shadow follows his feet and clears the old floor", async ({
  page,
}) => {
  await openAirport(page);
  const canvas = page.locator("canvas[data-drawn=hall]");
  const points = [
    { x: 132, y: 137 },
    { x: 76, y: 153 },
  ];
  const { data, info } = await sharp("src/assets/remaster/hall/bg.png")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const density = info.width / 320;
  const floor = points.map(({ x, y }) => {
    const i = (y * density * info.width + x * density) * 4;
    return Array.from(data.subarray(i, i + 4));
  });
  const pixels = () =>
    canvas.evaluate((element, samples) => {
      const surface = element as unknown as {
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
      const ctx = surface.getContext("2d")!;
      const scale = surface.width / 320;
      return samples.map(({ x, y }) =>
        Array.from(ctx.getImageData(x * scale, y * scale, 1, 1).data),
      );
    }, points);
  const before = await pixels();
  expect(before[0][0]).toBeLessThan(floor[0][0]);
  expect(before[1]).toEqual(floor[1]);
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error("Airport canvas is not visible");
  await page.mouse.click(
    bounds.x + (bounds.width * 72) / 320,
    bounds.y + (bounds.height * 150) / 160,
  );
  await page.clock.runFor(8000);
  const after = await pixels();
  expect(after[0]).toEqual(floor[0]);
  expect(after[1][0]).toBeLessThan(floor[1][0]);
});

for (const souvenir of [
  { id: "limoncello", title: "Limoncello" },
  { id: "swiss-knife", title: "Swiss Army knife" },
  { id: "swiss-cheese", title: "Swiss cheese" },
  { id: "telephone-miniature", title: "London calling" },
]) {
  test(`duty-free ${souvenir.id} opens its illustrated close-up`, async ({
    page,
  }) => {
    await openAirport(page);
    await page
      .locator(`[data-e2e=hotspot][data-hotspot="object:${souvenir.id}"]`)
      .click();
    const inspection = page.getByRole("dialog", {
      name: souvenir.title,
      exact: true,
    });
    for (let elapsed = 0; elapsed < 15000; elapsed += 500) {
      await advanceScene(page, 500);
      if (await inspection.isVisible()) break;
    }
    await expect(inspection).toBeVisible();
    await expect(inspection.getByRole("img")).toBeVisible();
    await inspection.getByRole("button", { name: "Back to the scene" }).click();
    await expect(inspection).toBeHidden();
    await expect(page.locator("canvas[data-drawn=hall]")).toBeVisible();
  });
}

for (const city of ["london", "zurich", "sorrento"] as const) {
  test(`boarding desk leaves the ${city} gate accessible`, async ({ page }) => {
    await openAirport(page);
    const desk = page.getByRole("button", {
      name: "Look at boarding desk",
      exact: true,
    });
    await expect(desk).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Look at security arch", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Look at rubber plant", exact: true }),
    ).toHaveCount(0);
    await desk.click();
    // Reach the desk first, then board via the actual door rather than its sign.
    await page.clock.runFor(12000);
    await page
      .locator(`[data-e2e=hotspot][data-hotspot="exit:gate-${city}"]`)
      .first()
      .click();
    const destination = page.locator(`canvas[data-drawn=${city}]`);
    for (let elapsed = 0; elapsed < 30000; elapsed += 1000) {
      await advanceScene(page, 1000);
      if (await destination.isVisible()) break;
    }
    await expect(destination).toBeVisible();
  });
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`Swiss room ambient motion respects ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await openAirport(page);
    await page
      .getByRole("button", {
        name: "Fly to Zurich: Experience, Resume",
        exact: true,
      })
      .first()
      .click();
    const canvas = page.locator("canvas[data-drawn=zurich]");
    for (let elapsed = 0; elapsed < 30000; elapsed += 500) {
      await advanceScene(page, 500);
      if (await canvas.isVisible()) break;
    }
    await expect(canvas).toBeVisible();
    await advanceScene(page, 2000);
    await expect(
      page.getByRole("button", {
        name: "Look at sleeping Swiss cow",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Look at rubber plant", exact: true }),
    ).toHaveCount(0);

    // Read only the three ambient regions, excluding stars, speech and Daniele.
    const pixels = () =>
      canvas.evaluate((element) => {
        const scene = element as unknown as {
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
        const d = scene.width / 320;
        return [
          { x: 219, y: 36, w: 9, h: 10 },
          { x: 5, y: 125, w: 35, h: 20 },
          { x: 65, y: 108, w: 14, h: 16 },
        ].map(({ x, y, w, h }) =>
          Array.from(
            scene.getContext("2d").getImageData(x * d, y * d, w * d, h * d)
              .data,
          ),
        );
      });
    const before = await pixels();
    await page.clock.runFor(700);
    const after = await pixels();
    for (let i = 0; i < before.length; i++) {
      if (reducedMotion === "reduce") expect(after[i]).toEqual(before[i]);
      else expect(after[i]).not.toEqual(before[i]);
    }
  });
}
