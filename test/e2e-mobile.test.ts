import { test, expect, type Page } from "@playwright/test";
import { PROFILE } from "../src/config/profile";

async function enterKitchen(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();
  await page.getByRole("link", { name: "Enter Pocket Adventure" }).tap();
  await expect(page.locator("[data-e2e=pocket-motion]")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.evaluate("document.fonts.ready");
}

function sectionLink(page: Page, label: string) {
  return page
    .getByRole("navigation", { name: "Portfolio" })
    .getByRole("link", { name: label, exact: true });
}

test("portfolio opens immediately and essential content is one tap away", async ({
  page,
}) => {
  await enterKitchen(page);
  for (const label of ["Experience", "Resume", "Contact"]) {
    await expect(sectionLink(page, label)).toBeInViewport();
    await sectionLink(page, label).tap();
    await expect(page.locator("[data-e2e=pocket-reading]")).toBeVisible();
    await expect(sectionLink(page, label)).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
});

test("painted objects open the corresponding content", async ({ page }) => {
  await enterKitchen(page);
  for (const [object, title] of [
    ["Postcards · About", "About Daniele"],
    ["Telephone · Contact", "Contact"],
    ["Career album · Experience", "Experience"],
    ["Document folder · Resume", "Resume"],
    ["Backpack and laptop · Skills", "Skills"],
  ]) {
    await page.getByRole("link", { name: object, exact: true }).tap();
    await expect(
      page.getByRole("heading", { name: title, exact: true, level: 1 }),
    ).toBeVisible();
    await sectionLink(page, "Explore").tap();
    await expect(page.locator("[data-e2e=pocket-scene]")).toBeVisible();
  }
});

test("career album scrolls through the full work history", async ({ page }) => {
  await enterKitchen(page);
  await sectionLink(page, "Experience").tap();
  await expect(
    page.getByRole("heading", { name: "Snyk", exact: true }),
  ).toBeVisible();
  const lastJob = page.getByRole("heading", {
    name: PROFILE.workExperience.at(-1)!.company,
    exact: true,
  });
  await lastJob.scrollIntoViewIfNeeded();
  await expect(lastJob).toBeInViewport();
  // Tall screens can show the whole history at once, so scroll to the end
  // to give the reset below something to undo.
  const reading = page.locator("[data-e2e=pocket-reading]");
  await reading.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  const { scrollTop, overflows } = await reading.evaluate((el) => ({
    scrollTop: el.scrollTop,
    overflows: el.scrollHeight > el.clientHeight,
  }));
  if (overflows) expect(scrollTop).toBeGreaterThan(0);
  await sectionLink(page, "Contact").tap();
  await expect
    .poll(() =>
      page.locator("[data-e2e=pocket-reading]").evaluate((el) => el.scrollTop),
    )
    .toBe(0);
});

test("contact and resume use the shared profile links", async ({ page }) => {
  await enterKitchen(page);
  await sectionLink(page, "Contact").tap();
  await expect(page.getByRole("link", { name: PROFILE.email })).toHaveAttribute(
    "href",
    `mailto:${PROFILE.email}`,
  );
  for (const [name, href] of [
    ["LinkedIn", PROFILE.social.linkedin],
    ["GitHub", PROFILE.social.github],
  ]) {
    await expect(
      page.getByRole("link", { name, exact: false }),
    ).toHaveAttribute("href", href);
    await expect(
      page.getByRole("link", { name, exact: false }),
    ).toHaveAttribute("target", "_blank");
    await expect(
      page.getByRole("link", { name, exact: false }),
    ).toHaveAttribute("rel", /noopener/);
  }
  await sectionLink(page, "Resume").tap();
  await expect(
    page.getByRole("link", { name: /Read or download my resume/ }),
  ).toHaveAttribute("href", PROFILE.resumeUrl);
});

test("browser Back, Forward, reload and direct section links work", async ({
  page,
}) => {
  await enterKitchen(page);
  await sectionLink(page, "Experience").tap();
  await sectionLink(page, "Contact").tap();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Experience", exact: true, level: 1 }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.locator("[data-e2e=pocket-scene]")).toBeVisible();
  await page.goForward();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Experience", exact: true, level: 1 }),
  ).toBeVisible();
  await page.goto("/#pocket-skills");
  await expect(
    page.getByRole("heading", { name: "Frontend", exact: true }),
  ).toBeVisible();
});

test("dialogue is optional and survives an inspection", async ({ page }) => {
  await enterKitchen(page);
  await page.getByRole("button", { name: "Talk to Daniele" }).tap();
  await page.getByRole("button", { name: "Coffee?", exact: true }).tap();
  await expect(
    page.getByText("A proper moka takes its time.", { exact: false }),
  ).toBeVisible();
  await sectionLink(page, "Resume").tap();
  await sectionLink(page, "Explore").tap();
  await expect(
    page.getByText("A proper moka takes its time.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "See you!" }).tap();
  await expect(
    page.getByRole("button", { name: "Talk to Daniele" }),
  ).toBeFocused();
});

test("scene stays free of labels while objects remain accessible", async ({
  page,
}) => {
  await enterKitchen(page);
  const scene = page.locator("[data-e2e=pocket-scene]");
  await expect(scene).toHaveText("");
  await expect(page.getByRole("button", { name: /Labels/ })).toHaveCount(0);
  await scene.getByRole("link", { name: "Telephone · Contact" }).focus();
  await expect(scene).toHaveText("");
  await page
    .getByRole("link", { name: "Telephone · Contact", exact: true })
    .tap();
  await expect(
    page.getByRole("heading", { name: "Contact", exact: true, level: 1 }),
  ).toBeVisible();
});

test("keyboard focus follows reading and returns to its opener", async ({
  page,
}) => {
  await enterKitchen(page);
  const opener = sectionLink(page, "About");
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-e2e=pocket-reading]")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
});

test("small phones retain separate touch targets and readable content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await enterKitchen(page);
  const objects = page.locator("[data-e2e=pocket-scene]").locator("a, button");
  const bounds = await objects.evaluateAll((elements) =>
    elements.map((el) => {
      const { x, y, width, height } = el.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
  for (const [index, box] of bounds.entries()) {
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    for (const other of bounds.slice(index + 1)) {
      expect(
        box.x + box.width <= other.x ||
          other.x + other.width <= box.x ||
          box.y + box.height <= other.y ||
          other.y + other.height <= box.y,
      ).toBe(true);
    }
  }
  await sectionLink(page, "Contact").tap();
  await expect(page.getByRole("link", { name: PROFILE.email })).toBeVisible();
  expect(
    await page.evaluate("document.documentElement.scrollWidth"),
  ).toBeLessThanOrEqual(320);
  await expect(page).toHaveScreenshot("pocket-small-contact.png", {
    animations: "disabled",
  });
});

test("landscape remains usable without a rotate-screen barrier", async ({
  page,
}) => {
  await enterKitchen(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await sectionLink(page, "Resume").tap();
  await page
    .getByRole("link", { name: /Read or download my resume/ })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("link", { name: /Read or download my resume/ }),
  ).toBeInViewport();
  expect(
    await page.evaluate("document.documentElement.scrollWidth"),
  ).toBeLessThanOrEqual(844);
});

test("reduced motion stops the ambient animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enterKitchen(page);
  const animated = await page
    .locator("[data-e2e=pocket-scene]")
    .evaluate(
      (el) =>
        el
          .getAnimations({ subtree: true })
          .filter(
            (animation: { playState: string }) =>
              animation.playState === "running",
          ).length,
    );
  expect(animated).toBe(0);
});

for (const label of [
  "Explore",
  "About",
  "Experience",
  "Skills",
  "Contact",
  "Resume",
]) {
  test(`portrait visual: ${label}`, async ({ page }) => {
    await enterKitchen(page);
    if (label !== "Explore") {
      await sectionLink(page, label).tap();
      await expect(page.locator("[data-e2e=pocket-reading]")).toBeVisible();
      await page
        .locator("[data-e2e=pocket-reading] > img")
        .evaluate((image) =>
          (image as unknown as { decode: () => Promise<void> }).decode(),
        );
    }
    await page.evaluate("document.fonts.ready");
    await expect(page).toHaveScreenshot(`pocket-${label.toLowerCase()}.png`, {
      animations: "disabled",
    });
  });
}

test("welcome recommends desktop before entering and keeps content accessible", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-e2e=pocket-welcome]")).toBeVisible();
  await expect(
    page.getByText("The full game is on desktop.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-e2e=pocket-scene]")).toHaveCount(0);
  for (const label of ["Experience", "Resume", "Contact"]) {
    await page
      .getByRole("navigation", { name: "Quick portfolio access" })
      .getByRole("link", { name: label, exact: true })
      .tap();
    await expect(page.locator("[data-e2e=pocket-reading]")).toBeVisible();
    await page.goBack();
    await expect(page.locator("[data-e2e=pocket-welcome]")).toBeVisible();
  }
  await page.getByRole("link", { name: "Enter Pocket Adventure" }).tap();
  await expect(page.locator("[data-e2e=pocket-scene]")).toBeVisible();
});

test("welcome visual", async ({ page }) => {
  await page.goto("/");
  await page
    .locator("[data-e2e=pocket-welcome] img")
    .evaluateAll(async (images) => {
      await Promise.all(
        images.map((image) =>
          (image as unknown as { decode: () => Promise<void> }).decode(),
        ),
      );
    });
  await expect(page).toHaveScreenshot("pocket-welcome.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("living scene pauses for reading and reduced motion", async ({ page }) => {
  await page.clock.install({ time: new Date("2030-01-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2030-01-01T12:00:00Z"));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await enterKitchen(page);
  const canvas = page.locator("[data-e2e=pocket-motion]");
  const pixels = () =>
    canvas.evaluate((el) => {
      const bytes = (el as unknown as { toDataURL: () => string }).toDataURL();
      let hash = 2166136261;
      for (let i = 0; i < bytes.length; i++)
        hash = Math.imul(hash ^ bytes.charCodeAt(i), 16777619);
      return hash >>> 0;
    });
  const before = await pixels();
  await page.clock.runFor(1000);
  expect(await pixels()).not.toEqual(before);
  await sectionLink(page, "Contact").tap();
  await expect(canvas).toHaveAttribute("data-running", "false");
  const reading = await pixels();
  await page.clock.runFor(2000);
  expect(await pixels()).toEqual(reading);
  await sectionLink(page, "Explore").tap();
  await expect(canvas).toHaveAttribute("data-running", "true");
  await page.clock.runFor(1000);
  expect(await pixels()).not.toEqual(reading);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(100);
  await expect(canvas).toHaveAttribute("data-running", "false");
  const still = await pixels();
  await page.clock.runFor(2000);
  expect(await pixels()).toEqual(still);
});

test("portfolio stays accessible when scene art fails and retry recovers", async ({
  page,
}) => {
  await page.route(/coffee-likeness-night/, (route) => route.abort());
  await page.goto("/#pocket-home");
  await expect(
    page.getByRole("button", { name: "Try the scene again" }),
  ).toBeVisible();
  await sectionLink(page, "Contact").tap();
  await expect(page.getByRole("link", { name: PROFILE.email })).toBeVisible();
  await sectionLink(page, "Explore").tap();
  await page.unroute(/coffee-likeness-night/);
  await page.getByRole("button", { name: "Try the scene again" }).tap();
  await expect(page.locator("[data-e2e=pocket-motion]")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page
    .locator('[data-layer="night"]')
    .evaluate((image) =>
      (image as unknown as { decode: () => Promise<void> }).decode(),
    );
});

test("Sorrento music and ambience are opt-in and can be muted", async ({
  page,
}) => {
  const sounds: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/audio/")) sounds.push(request.url());
  });
  await enterKitchen(page);
  expect(sounds).toEqual([]);
  const toolbar = page.getByRole("navigation", { name: "Portfolio" });
  await toolbar
    .getByRole("button", { name: "Enable sound", exact: true })
    .tap();
  await expect(
    toolbar.getByRole("button", { name: "Mute sound", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const track of ["/music/sorrento.mp3", "/ambience/sorrento.mp3"]) {
    await expect
      .poll(() => sounds.some((url) => url.endsWith(track)))
      .toBe(true);
  }
  await toolbar.getByRole("button", { name: "Mute sound", exact: true }).tap();
  await expect(
    toolbar.getByRole("button", { name: "Enable sound", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("nighttime scene and resting arm", async ({ page }) => {
  await page.clock.install({ time: new Date("2030-01-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2030-01-01T12:00:00Z"));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await enterKitchen(page);
  await page.clock.runFor(18800);
  await expect(page.locator("[data-e2e=pocket-motion]")).toHaveAttribute(
    "data-stage",
    "2",
  );
  await expect(page.locator("[data-e2e=pocket-motion]")).toHaveAttribute(
    "data-cup-pose",
    "table",
  );
  await expect(page).toHaveScreenshot("pocket-night.png", {
    animations: "disabled",
  });
});
