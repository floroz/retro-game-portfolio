import { expect, type Locator, type Page } from "@playwright/test";
import { advanceScene } from "./clock";

export async function waitForGameWindowReady(page: Page) {
  // Wait for Win95 desktop
  await expect(page.locator("[data-e2e=win95-desktop]")).toBeVisible({
    timeout: 30000,
  });

  // Wait for loading widget to appear and complete (game window appears after)
  await expect(page.locator("[data-e2e=win95-game-window]")).toBeVisible({
    timeout: 30000,
  });
}

export async function dismissWelcomeAndWaitForDialog(page: Page) {
  await page.keyboard.press("Space");
  const dialog = page.locator("[data-e2e=adventure-dialog]");
  await expect(dialog).toBeVisible({ timeout: 5000 });
  // Daniele says the line over his head; Enter skips ahead to the choices.
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-e2e=dialog-options]")).toBeVisible({
    timeout: 30000,
  });
  return dialog;
}

/** Launch through the boarding pass, with a clock driven by the real frame loop. */
export async function startAdventure(page: Page) {
  await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
  await page.goto("/");
  await waitForGameWindowReady(page);
  const welcome = page.locator("[data-e2e=welcome-screen]");
  await expect(welcome).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.clock.pauseAt(
    new Date((await page.evaluate(() => Date.now())) + 1000),
  );
  // Audio has its own functional tests. Keep these journeys silent.
  await welcome.getByRole("button", { name: "Sound", exact: true }).click();
  await page.keyboard.press("Space");
  await advanceScene(page, 1000);
  await expect(welcome).toBeHidden();
  await expect(page.locator("[data-e2e=adventure-dialog]")).toBeVisible();
}

export async function openAirport(page: Page) {
  await startAdventure(page);
  await page.keyboard.press("Escape");
  await advanceScene(page, 1000);
  await expect(page.locator("canvas[data-drawn=hall]")).toBeVisible();
}

/** Advance only until the player reaches the destination or queued close-up. */
export async function advanceUntilVisible(page: Page, target: Locator) {
  for (let elapsed = 0; elapsed < 30000; elapsed += 500) {
    if (await target.isVisible()) break;
    await advanceScene(page, 500);
  }
  await expect(target).toBeVisible();
}

export async function arriveInScene(page: Page, scene: string) {
  await advanceUntilVisible(page, page.locator(`canvas[data-drawn=${scene}]`));
  // Finish the entrance iris before interacting with the room.
  await advanceScene(page, 1000);
}
