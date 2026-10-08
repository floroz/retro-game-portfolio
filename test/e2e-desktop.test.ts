import { beginAdventure } from "./adventure";
import { expect, test, type Page } from "@playwright/test";
import { PROFILE } from "../src/config/profile";

test.use({ viewport: { width: 1440, height: 1000 } });

async function openDesktop(page: Page) {
  await page.clock.install({ time: new Date("2030-01-01T12:00:00Z") });
  await page.goto("/");
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeVisible({
    timeout: 30000,
  });
  await page.waitForLoadState("networkidle");
  await page.clock.pauseAt(new Date("2030-01-01T12:01:00Z"));
}

test("Start menu supports keyboard navigation, dismissal and System Properties", async ({
  page,
}) => {
  await openDesktop(page);
  await page.getByRole("button", { name: "Show Desktop", exact: true }).click();
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeHidden();
  await expect(page).toHaveScreenshot("desktop.png");
  const start = page.getByRole("button", { name: "Start menu", exact: true });
  await start.press("ArrowUp");
  const menu = page.getByRole("menu", { name: "Start menu" });
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    menu.getByRole("menuitem", { name: "Show Desktop" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.mouse.move(0, 0);
  await expect(page).toHaveScreenshot("start-menu.png");
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(start).toBeFocused();
  await start.click();
  await page.mouse.click(1000, 300);
  await expect(menu).toBeHidden();
  await start.click();
  await menu.getByRole("menuitem", { name: "About this computer" }).click();
  const properties = page
    .locator("[data-e2e=win95-window]")
    .filter({ hasText: "System Properties" });
  await expect(properties).toContainText(PROFILE.name);
  await page.mouse.move(0, 0);
  await expect(page).toHaveScreenshot("system-properties.png");
  await properties.getByRole("button", { name: "OK", exact: true }).click();
  await expect(properties).toBeHidden();
});

test("minimize, Show Desktop and restore preserve window geometry", async ({
  page,
}) => {
  await openDesktop(page);
  await page.locator("[data-e2e=desktop-icon-recycle-bin]").click();
  const window = page
    .locator("[data-e2e=win95-window]")
    .filter({ hasText: "Recycle Bin" });
  const taskbarButton = page.locator("[data-e2e=taskbar-recycle-bin]");
  await expect(window).toBeVisible();
  const original = await window.boundingBox();
  await window.getByRole("button", { name: "Maximize window" }).click();
  await expect(
    window.getByRole("button", { name: "Restore window" }),
  ).toBeVisible();
  await expect
    .poll(async () => (await window.boundingBox())?.width)
    .toBeGreaterThan(original!.width);
  const maximized = await window.boundingBox();
  expect(maximized!.y + maximized!.height).toBeLessThanOrEqual(964);
  await window.getByRole("button", { name: "Restore window" }).click();
  await expect.poll(() => window.boundingBox()).toEqual(original);
  await window.getByRole("button", { name: "Minimize window" }).click();
  await expect(window).toBeHidden();
  await taskbarButton.click();
  await expect(window).toBeVisible();
  await expect.poll(() => window.boundingBox()).toEqual(original);
  await page.getByRole("button", { name: "Show Desktop", exact: true }).click();
  await expect(window).toBeHidden();
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeHidden();
  await page
    .getByRole("button", { name: "Launch adventure", exact: true })
    .click();
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeVisible();
  await taskbarButton.click();
  await expect(window).toBeVisible();
  await expect.poll(() => window.boundingBox()).toEqual(original);
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(
    window.getByRole("button", { name: "Close window" }),
  ).toBeInViewport();
});

test("Show Desktop restores the active adventure at its original size", async ({
  page,
}) => {
  await openDesktop(page);
  await beginAdventure(page);
  await page.clock.runFor(1000);
  await expect(page.locator("[data-e2e=adventure-dialog]")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.clock.runFor(1000);
  const canvas = page.locator("canvas[data-drawn=hall]");
  await expect(canvas).toBeVisible();
  const original = await canvas.boundingBox();
  expect(original!.width).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Show Desktop", exact: true }).click();
  await expect(canvas).toBeHidden();
  // Let the resize observer measure the hidden window before restoring it.
  await page.clock.runFor(1000);
  await page.locator("[data-e2e=taskbar-game]").click();
  await page.clock.runFor(100);
  await expect(canvas).toBeVisible();
  await expect.poll(() => canvas.boundingBox()).toEqual(original);
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeHidden();
  await expect(
    page.locator("[data-e2e=toolbar-button]").first(),
  ).toBeInViewport();
});

test("Start shortcuts reach portfolio content and tray sound is reversible", async ({
  page,
}) => {
  await openDesktop(page);
  const mute = page.getByRole("button", { name: "Mute sound", exact: true });
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  await mute.click();
  const sound = page.getByRole("button", { name: "Enable sound", exact: true });
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await sound.click();
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  await mute.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  for (const [name, section] of [
    ["Contact", "Contact"],
    ["Work Experience", "Experience"],
  ] as const) {
    await page.getByRole("button", { name: "Start menu", exact: true }).click();
    await page.getByRole("menuitem", { name, exact: true }).click();
    await expect(page.getByRole("menu", { name: "Start menu" })).toBeHidden();
    const content = page.getByRole("dialog", { name: section, exact: true });
    await expect(content).toBeVisible();
    if (section === "Contact")
      await expect(content).toContainText(PROFILE.email);
    await page.keyboard.press("Escape");
    await expect(content).toBeHidden();
  }
});

test("launch dialog can be canceled and restarted from Quick Launch", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2030-01-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2030-01-01T12:00:00Z"));
  await page.goto("/");
  const loading = page.locator("[data-e2e=win95-loading-widget]");
  await expect(loading).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.clock.runFor(750);
  await expect(
    loading.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeInViewport();
  // Asset decoding changes the filled segment count. Pin halfway progress for
  // this chrome snapshot; cancel and restart still exercise real progress.
  const snapshotProgress = await page.addStyleTag({
    content: `
      [data-e2e="win95-loading-widget"] [role="progressbar"] > div {
        background: transparent !important;
      }
      [data-e2e="win95-loading-widget"] [role="progressbar"] > div:nth-child(-n + 11) {
        background: #000080 !important;
      }
    `,
  });
  await expect(loading).toHaveScreenshot("launch-dialog.png");
  await snapshotProgress.evaluate((style) => style.remove());
  await loading.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.clock.runFor(2000);
  await expect(loading).toBeHidden();
  await expect(page.locator("[data-e2e=win95-game-window]")).toBeHidden();
  await page
    .getByRole("button", { name: "Launch adventure", exact: true })
    .click();
  await expect(loading).toBeVisible();
  await page.clock.runFor(1700);
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeVisible();
});
