import { beginAdventure } from "./adventure";
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { encodeWebp } from "../scripts/vite/optimize-images";
import { advanceScene } from "./clock";

test.use({ viewport: { width: 1440, height: 1000 } });
// Density-4 animation sampling is expensive in Linux WebKit.
test.setTimeout(90000);

/** A source image's pixels as the build ships them (optimize-images.ts). */
async function shippedArt(path: string) {
  const source = await readFile(path);
  const shipped = (await encodeWebp(source)) ?? source;
  return sharp(shipped)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

async function openAirport(page: Page) {
  await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
  await page.goto("/");
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeVisible({
    timeout: 30000,
  });
  // Finish loading art, then freeze before the scene mounts. Freezing after
  // entering the lounge let real loading time change the passengers' phase.
  await page.waitForLoadState("networkidle");
  await page.clock.pauseAt(
    new Date((await page.evaluate(() => Date.now())) + 1000),
  );
  await beginAdventure(page);
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

/** Isolate the clerk, excluding the counter, signs and passing passengers. */
async function clerkPixels(page: Page) {
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
    const density = canvas.width / 320;
    return Array.from(
      canvas
        .getContext("2d")!
        .getImageData(30 * density, 45 * density, 20 * density, 21 * density)
        .data,
    );
  });
}

test("Lost & Found clerk stamps forms and its keyboard hotspots leave the gates accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openAirport(page);
  const before = await clerkPixels(page);
  let changed = false;
  for (let time = 0; time < 5400; time += 300) {
    await advanceScene(page, 300);
    changed ||= (await clerkPixels(page)).some(
      (value, index) => value !== before[index],
    );
  }
  expect(changed).toBe(true);
  await advanceScene(page, 22000);
  // As in the other live airport snapshot, allow a neighbouring walking frame
  // for ambient passengers. Clerk motion is checked independently above.
  await expect(page.locator("[data-e2e=scene]")).toHaveScreenshot(
    "airport-lost-and-found-active.png",
    { maxDiffPixelRatio: 0.02 },
  );
  for (const id of [
    "lost-and-found-clerk",
    "service-bell",
    "unclaimed-trunk",
  ]) {
    const hotspot = page.locator(
      `[data-e2e=hotspot][data-hotspot="object:${id}"]`,
    );
    await hotspot.focus();
    await page.keyboard.press("Enter");
    await advanceScene(page, 8000);
    await expect(page.locator("canvas[data-drawn=hall]")).toBeVisible();
    await expect(page.locator("[data-e2e=object-inspection]")).toHaveCount(0);
  }
  await expect(page.locator('[data-hotspot="object:duty-free"]')).toHaveCount(
    0,
  );
  await page.locator('[data-hotspot="exit:gate-sorrento"]').first().click();
  const destination = page.locator("canvas[data-drawn=sorrento]");
  for (let time = 0; time < 30000; time += 1000) {
    await advanceScene(page, 1000);
    if (await destination.isVisible()) break;
  }
  await expect(destination).toBeVisible();
});

test("Lost & Found clerk holds its resting pose with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openAirport(page);
  const before = await clerkPixels(page);
  await advanceScene(page, 6000);
  expect(await clerkPixels(page)).toEqual(before);
});

/** Each timetable row, excluding the static frame and column headings. */
async function flightBoardPixels(page: Page) {
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
    const ctx = canvas.getContext("2d")!;
    const d = canvas.width / 320;
    return [5.5, 42.5].flatMap((x) =>
      [0, 1, 2].map((row) =>
        Array.from(
          ctx.getImageData(
            x * d,
            (12.2 + (row * 11.5) / 3) * d,
            33.5 * d,
            (11.5 / 3) * d,
          ).data,
        ),
      ),
    );
  });
}

test("airport board silently flips one row every five seconds", async ({
  page,
}) => {
  const boardSoundRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/audio/sfx/split-flap.mp3"))
      boardSoundRequests.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openAirport(page);
  await expect(
    page.getByRole("button", {
      name: "Look at arrivals and departures board",
      exact: true,
    }),
  ).toBeVisible();
  const before = await flightBoardPixels(page);
  let after = before;
  for (let t = 0; t < 6000; t += 200) {
    await advanceScene(page, 200);
    after = await flightBoardPixels(page);
    if (after[0].some((v, i) => v !== before[0][i])) break;
  }
  expect(after[0]).not.toEqual(before[0]);
  expect(after.slice(1)).toEqual(before.slice(1));
  await advanceScene(page, 1500);
  const settled = await flightBoardPixels(page);
  expect(settled[0]).not.toEqual(before[0]);
  expect(settled.slice(1)).toEqual(before.slice(1));
  await advanceScene(page, 2000);
  expect(await flightBoardPixels(page)).toEqual(settled);
  // Cross the next five-second boundary: departure row two takes its turn.
  let next = settled;
  for (let t = 0; t < 4000; t += 200) {
    await advanceScene(page, 200);
    next = await flightBoardPixels(page);
    if (next[4].some((v, i) => v !== settled[4][i])) break;
  }
  expect(next[4]).not.toEqual(settled[4]);
  expect(next.filter((_, i) => i !== 4)).toEqual(
    settled.filter((_, i) => i !== 4),
  );
  expect(boardSoundRequests).toEqual([]);
});

test("airport board holds the complete timetable still with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openAirport(page);
  const before = await flightBoardPixels(page);
  await advanceScene(page, 16000);
  expect(await flightBoardPixels(page)).toEqual(before);
});

test("scene pixels keep their geometry across repeated frames", async ({
  page,
}) => {
  await openAirport(page);
  // Clear floor landmarks, away from passengers, labels and the character.
  // Compare against the art the build ships so an intended palette change
  // does not turn this geometry regression into a second screenshot baseline.
  const points = [
    { x: 40, y: 145 },
    { x: 160, y: 150 },
    { x: 240, y: 150 },
  ];
  const { data, info } = await shippedArt("src/assets/remaster/hall/bg.png");
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
  const { data, info } = await shippedArt("src/assets/remaster/hall/bg.png");
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
        name: "Fly to Zürich: Experience, Resume",
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
    // Step aside so the garden snapshots show the cow's contact with the lawn.
    const arrivalBounds = await canvas.boundingBox();
    if (!arrivalBounds) throw new Error("Missing Zurich canvas bounds");
    await page.mouse.click(
      arrivalBounds.x + (arrivalBounds.width * 210) / 320,
      arrivalBounds.y + (arrivalBounds.height * 150) / 160,
    );
    await advanceScene(page, 12000);
    await expect(
      page.getByRole("button", {
        name: "Look at curious Swiss cow",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Look at rubber plant", exact: true }),
    ).toHaveCount(0);

    // Read the pendulum, steam, lake and balloon, excluding speech and Daniele.
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
          { x: 234, y: 35, w: 10, h: 10 },
          { x: 26, y: 55, w: 9, h: 15 },
          { x: 140, y: 55, w: 58, h: 11 },
          { x: 115, y: 24, w: 83, h: 20 },
        ].map(({ x, y, w, h }) =>
          Array.from(
            scene.getContext("2d").getImageData(x * d, y * d, w * d, h * d)
              .data,
          ),
        );
      });
    if (reducedMotion === "reduce") {
      await expect(canvas).toHaveScreenshot("zurich-daytime-chalet.png");
    }
    const before = await pixels();
    await page.clock.runFor(700);
    const after = await pixels();
    for (let i = 0; i < before.length; i++) {
      if (reducedMotion === "reduce") expect(after[i]).toEqual(before[i]);
      else expect(after[i]).not.toEqual(before[i]);
    }
    if (reducedMotion === "no-preference") {
      await advanceScene(page, 14000);
      await expect(canvas).toHaveScreenshot("zurich-balloon.png");
    }
    // The sky above the cow used to have no exit hotspot. Keep the cow
    // inspectable, then leave through that formerly dead part of the opening.
    await page
      .getByRole("button", {
        name: "Look at curious Swiss cow",
        exact: true,
      })
      .hover();
    await expect(page.locator("[data-e2e=toolbar-status]")).toHaveText(
      "Look at curious Swiss cow",
    );
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error("Missing Zurich canvas bounds");
    await page.mouse.click(
      bounds.x + (bounds.width * 287) / 320,
      bounds.y + (bounds.height * 30) / 160,
    );
    await advanceScene(page, 6000);
    await expect(page.locator("canvas[data-drawn=hall]")).toBeVisible();
  });
}
