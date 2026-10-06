import { expect, test, type Page } from "@playwright/test";
import { advanceUntilVisible, arriveInScene, openAirport } from "./adventure";
import { advanceScene } from "./clock";

test.use({ viewport: { width: 1440, height: 1000 } });
test.setTimeout(60000);

const paintedScene = (page: Page) => page.locator("canvas[data-drawn]");
const gate = (page: Page, scene: string) =>
  page.locator(`[data-hotspot="exit:gate-${scene}"]`).first();
const gameWindow = (page: Page) =>
  page
    .locator("[data-e2e=win95-window]")
    .filter({ has: page.locator("[data-e2e=win95-game-window]") });

async function position(page: Page): Promise<{ x: number; y: number }> {
  const value = await paintedScene(page).getAttribute("data-position");
  if (!value) throw new Error("Scene has not rendered an actor position");
  return JSON.parse(value) as { x: number; y: number };
}

for (const input of ["click", "Escape"] as const) {
  test(`${input} cancels the gate walk and skips the map to a usable room`, async ({
    page,
  }) => {
    await openAirport(page);
    const skip = async () => {
      if (input === "Escape") await page.keyboard.press("Escape");
      else
        await page
          .locator("[data-e2e=scene]")
          .click({ position: { x: 20, y: 20 } });
    };
    await gate(page, "london").click();
    await advanceScene(page, 100);
    // The clock has not advanced enough to reach the gate or complete travel.
    await expect(paintedScene(page)).toHaveAttribute("data-drawn", "hall");
    await skip();
    await advanceScene(page, 8000);
    await expect(paintedScene(page)).toHaveAttribute("data-drawn", "hall");
    await gate(page, "london").click();
    await advanceUntilVisible(page, page.locator("canvas[data-drawn=map]"));
    await skip();
    // A single frame after skipping must already paint the destination.
    await advanceScene(page, 100);
    await expect(paintedScene(page)).toHaveAttribute("data-drawn", "london");
    await arriveInScene(page, "london");
    await page.locator('[data-hotspot="object:back-bar"]').first().click();
    const skills = page.getByRole("dialog", { name: "Skills", exact: true });
    await advanceUntilVisible(page, skills);
    await expect(skills).toHaveAttribute("data-ready", "true");
    await page.keyboard.press("Escape");
    await expect(skills).toBeHidden();
    await page.locator('[data-hotspot="exit:door-hall"]').first().click();
    await arriveInScene(page, "hall");

    await page.getByRole("button", { name: /^Resume, in / }).click();
    await expect(
      page.getByRole("dialog", { name: "Resume", exact: true }),
    ).toBeVisible();
  });
}

test("arrow and WASD walking stop on key release and browser blur", async ({
  page,
}) => {
  await openAirport(page);
  for (const key of ["ArrowRight", "a"]) {
    const before = await position(page);
    await page.keyboard.down(key);
    await advanceScene(page, 300);
    const walking = await position(page);
    if (key === "ArrowRight") expect(walking.x).toBeGreaterThan(before.x + 5);
    else expect(walking.x).toBeLessThan(before.x - 5);
    await page.keyboard.up(key);
    await advanceScene(page, 500);
    expect(await position(page)).toEqual(walking);
  }

  await page.keyboard.down("ArrowLeft");
  await advanceScene(page, 200);
  const beforeBlur = await position(page);
  // Headless browsers do not consistently emit OS focus events on tab changes.
  // Deliver the browser blur event while retaining the held key; normal keyboard
  // events and the production frame loop still drive all movement assertions.
  await page.evaluate(() => {
    const browserWindow = globalThis as unknown as {
      dispatchEvent(event: Event): boolean;
    };
    browserWindow.dispatchEvent(new Event("blur"));
  });
  await advanceScene(page, 500);
  expect(await position(page)).toEqual(beforeBlur);
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.down("ArrowRight");
  await advanceScene(page, 300);
  expect((await position(page)).x).toBeGreaterThan(beforeBlur.x + 5);
  await page.keyboard.up("ArrowRight");
});

test("another desktop window clears held walking keys and blocks new movement", async ({
  page,
}) => {
  await openAirport(page);
  await page.keyboard.down("ArrowRight");
  await advanceScene(page, 300);
  const beforeFocusLoss = await position(page);
  await page.locator("[data-e2e=desktop-icon-recycle-bin]").click();
  const bin = page
    .locator("[data-e2e=win95-window]")
    .filter({ hasText: "Recycle Bin" });
  await expect(bin).toBeVisible();
  await advanceScene(page, 500);
  expect(await position(page)).toEqual(beforeFocusLoss);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.down("a");
  await advanceScene(page, 500);
  expect(await position(page)).toEqual(beforeFocusLoss);
  await page.keyboard.up("a");
  await bin.getByRole("button", { name: "Close window" }).click();
  await gameWindow(page)
    .getByText("Portfolio Remastered", { exact: false })
    .click();
  await page.keyboard.down("ArrowLeft");
  await advanceScene(page, 300);
  expect((await position(page)).x).toBeLessThan(beforeFocusLoss.x - 5);
  await page.keyboard.up("ArrowLeft");
});

test("compact pointer interactions survive moving, resizing and reopening the game", async ({
  page,
}) => {
  await openAirport(page);
  await gate(page, "sorrento").click();
  await arriveInScene(page, "sorrento");
  const originalWidth = (await gameWindow(page).boundingBox())?.width;
  if (!originalWidth) throw new Error("Game window is not visible");
  await page.setViewportSize({ width: 1024, height: 768 });
  await advanceScene(page, 100);
  const wrapper = gameWindow(page);
  await expect
    .poll(async () => (await wrapper.boundingBox())?.width)
    .toBeLessThan(originalWidth);
  const compactBounds = await wrapper.boundingBox();
  if (!compactBounds) throw new Error("Compact game window is not visible");
  const title = wrapper.getByText("Portfolio Remastered", { exact: false });
  const titleBounds = await title.boundingBox();
  if (!titleBounds) throw new Error("Game title bar is not visible");
  await page.mouse.move(titleBounds.x + 100, titleBounds.y + 8);
  await page.mouse.down();
  await page.mouse.move(titleBounds.x + 120, titleBounds.y + 28, { steps: 5 });
  await page.mouse.up();
  await advanceScene(page, 100);
  await expect
    .poll(async () => (await wrapper.boundingBox())?.y)
    .toBeGreaterThan(compactBounds.y + 5);
  await expect(title).toBeInViewport();

  const fridge = page.locator('[data-hotspot="object:fridge"]').first();
  const beforeLook = await position(page);
  await fridge.click({ button: "right" });
  await advanceScene(page, 100);
  await expect(paintedScene(page)).toHaveAttribute("data-speaking", "true");
  await expect(page.locator("[data-e2e=object-inspection]")).toBeHidden();
  expect(await position(page)).toEqual(beforeLook);
  await advanceScene(page, 10000);
  await expect(paintedScene(page)).toHaveAttribute("data-speaking", "false");
  await fridge.click();
  const inspection = page.locator("[data-e2e=object-inspection]");
  await advanceUntilVisible(page, inspection);
  await expect(inspection.getByRole("heading", { level: 2 })).toHaveText(
    /^About /,
  );
  await inspection
    .getByRole("button", { name: "Back to the scene", exact: true })
    .click();
  const beforeClose = await position(page);
  await wrapper.getByRole("button", { name: "Close window" }).click();
  await expect(wrapper).toBeHidden();
  await page
    .getByRole("button", { name: "Launch adventure", exact: true })
    .click();
  await advanceScene(page, 2000);
  await expect(wrapper).toBeVisible();
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeHidden();
  await expect(paintedScene(page)).toHaveAttribute("data-drawn", "sorrento");
  expect(await position(page)).toEqual(beforeClose);
  await page.locator('[data-hotspot="exit:door-hall"]').first().click();
  await arriveInScene(page, "hall");
  await page.getByRole("button", { name: /^Contact, in / }).click();
  await expect(
    page.getByRole("dialog", { name: "Contact", exact: true }),
  ).toBeVisible();
});
