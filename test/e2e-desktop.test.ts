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

test("minimize, Show Desktop and restore preserve window contents and geometry", async ({
  page,
}) => {
  await openDesktop(page);
  await page
    .getByRole("button", { name: "Launch MS-DOS Prompt", exact: true })
    .click();
  const terminal = page.locator("[data-e2e=win95-terminal-window]");
  const window = page
    .locator("[data-e2e=win95-window]")
    .filter({ has: terminal });
  const input = terminal.locator("[data-e2e=terminal-input]");
  await input.fill("keep this unfinished command");
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
  await expect(page).toHaveScreenshot("terminal-maximized.png");
  await window.getByRole("button", { name: "Restore window" }).click();
  await expect.poll(() => window.boundingBox()).toEqual(original);
  await window.getByRole("button", { name: "Minimize window" }).click();
  await expect(terminal).toBeHidden();
  await page.locator("[data-e2e=taskbar-terminal]").click();
  await expect(terminal).toBeVisible();
  await expect.poll(() => window.boundingBox()).toEqual(original);
  await expect(input).toHaveValue("keep this unfinished command");
  await page.getByRole("button", { name: "Show Desktop", exact: true }).click();
  await expect(terminal).toBeHidden();
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeHidden();
  await page
    .getByRole("button", { name: "Launch adventure", exact: true })
    .click();
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeVisible();
  await page.locator("[data-e2e=taskbar-terminal]").click();
  await expect(terminal).toBeVisible();
  await expect.poll(() => window.boundingBox()).toEqual(original);
  await expect(input).toHaveValue("keep this unfinished command");
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(
    window.getByRole("button", { name: "Close window" }),
  ).toBeInViewport();
});

test("Show Desktop restores the active adventure at its original size", async ({
  page,
}) => {
  await openDesktop(page);
  await page.keyboard.press("Space");
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
  const sound = page.getByRole("button", { name: "Enable sound", exact: true });
  await sound.click();
  await expect(
    page.getByRole("button", { name: "Mute sound", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Mute sound", exact: true }).click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  for (const name of ["Contact", "Work Experience"]) {
    await page.getByRole("button", { name: "Start menu", exact: true }).click();
    await page.getByRole("menuitem", { name, exact: true }).click();
    await expect(page.getByRole("menu", { name: "Start menu" })).toBeHidden();
    const terminal = page.locator("[data-e2e=win95-terminal-window]");
    await expect(terminal).toBeVisible();
    await expect(terminal).toContainText(
      name === "Contact" ? PROFILE.email : PROFILE.workExperience[0].company,
    );
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
  await expect(loading).toHaveScreenshot("launch-dialog.png");
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
