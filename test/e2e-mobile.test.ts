import { test, expect } from "@playwright/test";
import { enterKitchen, sectionLink } from "./pocket";
import { PROFILE } from "../src/config/profile";

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
    }
    await page.evaluate("document.fonts.ready");
    await expect(page).toHaveScreenshot(`pocket-${label.toLowerCase()}.png`, {
      animations: "disabled",
    });
  });
}

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
