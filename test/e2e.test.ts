import { test, expect, type Page } from "@playwright/test";
import { PROFILE } from "../src/config/profile";

// Ensure desktop viewport for all tests
test.use({
  viewport: { width: 1280, height: 720 },
});

// Helper: Wait for Win95 desktop and game window to be ready
async function waitForGameWindowReady(page: Page) {
  // Wait for Win95 desktop
  await expect(page.locator("[data-e2e=win95-desktop]")).toBeVisible({
    timeout: 30000,
  });

  // Wait for loading widget to appear and complete (game window appears after)
  await expect(page.locator("[data-e2e=win95-game-window]")).toBeVisible({
    timeout: 30000,
  });
}

// Helper: Dismiss welcome screen and wait for the conversation's first choices
async function dismissWelcomeAndWaitForDialog(page: Page) {
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

// Helper: Close the game window via its close button
async function closeGameWindow(page: Page) {
  // The game window is wrapped in a Win95Window which has the close button
  // The window may be larger than viewport, so we use dispatchEvent to click
  const gameWindowWrapper = page
    .locator("[data-e2e=win95-window]")
    .filter({ has: page.locator("[data-e2e=win95-game-window]") });
  const closeButton = gameWindowWrapper.locator(
    'button[aria-label="Close window"]',
  );
  // Use dispatchEvent since the button may be outside viewport bounds
  await closeButton.dispatchEvent("click");
}

test.describe("Portfolio E2E Tests", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");

    // Wait for the page to be fully loaded
    await expect(page).toHaveTitle(/Daniele Tortora/i);
  });

  test("should display the game canvas in Win95 window", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Wait for Win95 desktop and game window
    await waitForGameWindowReady(page);

    // Wait for welcome screen inside game window
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Dismiss welcome screen
    await page.keyboard.press("Space");

    // Wait for game canvas to appear inside the Win95 game window
    const gameCanvas = page.locator("[data-e2e=game-canvas]");
    await expect(gameCanvas).toBeVisible({ timeout: 10000 });
    // Preserve the portrait atlas's detail instead of shrinking it through
    // the old 640x320 scene surface before CSS scales the game up again.
    const paintedScene = page.locator("canvas[data-drawn]");
    await expect(paintedScene).toHaveAttribute("width", "1280");
    await expect(paintedScene).toHaveAttribute("height", "640");
  });
});

test.describe("Visual Regression Tests", () => {
  test("welcome screen", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for Win95 desktop and game window to be ready
    await waitForGameWindowReady(page);

    // Wait for welcome screen to be visible inside game window
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Wait for content to be fully rendered
    await expect(page.locator("[data-e2e=welcome-screen-name]")).toBeVisible();
    await expect(page.locator("[data-e2e=welcome-screen-title]")).toBeVisible();
    await expect(
      page.locator("[data-e2e=welcome-screen-prompt]"),
    ).toBeVisible();

    // Small delay to ensure all CSS animations have settled
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("01-welcome-screen.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
      timeout: 30000,
    });
  });

  test("intro dialog with typewriter complete", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for Win95 desktop and game window
    await waitForGameWindowReady(page);

    // Wait for welcome screen first
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Dismiss welcome screen and wait for dialog
    const adventureDialog = await dismissWelcomeAndWaitForDialog(page);

    // Verify the dialog option text is visible (first dialog shows "Continue...")
    await expect(page.getByText("Continue...")).toBeVisible();

    // Verify dialog is visible (already checked in helper but explicit for clarity)
    await expect(adventureDialog).toBeVisible();

    // Allow browser to finish painting before screenshot
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot("02-intro-dialog.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
      timeout: 30000,
    });
  });

  test("game scene after dialog closed", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for Win95 desktop and game window
    await waitForGameWindowReady(page);

    // Wait for welcome screen first
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Dismiss welcome screen and wait for dialog
    const adventureDialog = await dismissWelcomeAndWaitForDialog(page);

    // Close the dialog by pressing Escape
    await page.keyboard.press("Escape");

    // Wait for dialog to be gone
    await expect(adventureDialog).toBeHidden({ timeout: 10000 });

    // Wait for game scene to be fully visible inside Win95 window
    const gameCanvas = page.locator("[data-e2e=game-canvas]");
    await expect(gameCanvas).toBeVisible();

    // Wait for scene elements to load
    await expect(page.locator("[data-e2e=scene]")).toBeVisible();
    await expect(page.locator("[data-e2e=toolbar]")).toBeVisible();

    // Longer delay to ensure scene is fully rendered (especially for webkit)
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot("03-game-scene.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
      timeout: 30000,
    });
  });

  for (const section of [
    "skills",
    "experience",
    "about",
    "contact",
    "resume",
  ]) {
    test(`illustrated inspection - ${section}`, async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await waitForGameWindowReady(page);
      await dismissWelcomeAndWaitForDialog(page);
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: new RegExp(`^${section}, in `, "i") })
        .click();

      const inspection = page.locator("[data-e2e=object-inspection]");
      await expect(inspection).toHaveAttribute("data-ready", "true", {
        timeout: 30000,
      });
      await expect(inspection.getByRole("heading", { level: 2 })).toHaveText(
        section === "about" ? "About Daniele" : new RegExp(`^${section}$`, "i"),
      );
      await expect(inspection.getByRole("img")).toBeVisible();
      await expect(inspection.getByLabel("Inspection text")).toBeInViewport();
      if (section === "contact") {
        await expect(inspection.locator('a[href^="mailto:"]')).toBeVisible();
        await expect(
          inspection.getByRole("link", { name: "LinkedIn", exact: true }),
        ).toBeVisible();
      }
      if (section === "resume") {
        await expect(
          inspection.getByRole("link", {
            name: "Read or download my resume (PDF)",
          }),
        ).toHaveAttribute("href", /\.pdf$/);
      }
      await expect(page).toHaveScreenshot(`04-inspection-${section}.png`, {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.02,
        timeout: 30000,
      });
    });
  }

  test("illustrated skills inspection pagination", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await waitForGameWindowReady(page);
    await dismissWelcomeAndWaitForDialog(page);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^Skills, in / }).click();
    const inspection = page.locator("[data-e2e=object-inspection]");
    await expect(inspection).toHaveAttribute("data-ready", "true", {
      timeout: 30000,
    });
    // Pages are measured to fit the card, so a long skill group can continue
    // onto a second page under the same heading. Read the total it settled on.
    const label = await inspection
      .getByLabel(/^Page 1 of \d+$/)
      .getAttribute("aria-label");
    const pageCount = Number(label?.match(/of (\d+)$/)?.[1]);
    expect(pageCount).toBeGreaterThanOrEqual(
      Object.keys(PROFILE.skills).length,
    );
    await expect(
      inspection.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    const pageText = inspection.locator("[data-e2e=inspection-page]");
    const firstPage = await pageText.textContent();
    await page.keyboard.press("ArrowRight");
    await expect(
      inspection.getByLabel(`Page 2 of ${pageCount}`, { exact: true }),
    ).toBeVisible();
    await expect(pageText).not.toHaveText(firstPage!);
    for (let i = 2; i <= pageCount; i++)
      await page.keyboard.press("ArrowRight");
    await expect(
      inspection.getByLabel(`Page ${pageCount} of ${pageCount}`, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      inspection.getByRole("button", { name: "Next page" }),
    ).toBeDisabled();
    await page.keyboard.press("ArrowLeft");
    await expect(
      inspection.getByLabel(`Page ${pageCount - 1} of ${pageCount}`, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page).toHaveScreenshot(
      "04-inspection-skills-penultimate.png",
      {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.02,
        timeout: 30000,
      },
    );
  });

  test("boarding-pass inspection returns to the same scene with Escape", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await waitForGameWindowReady(page);
    await dismissWelcomeAndWaitForDialog(page);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^Skills, in / }).click();
    const inspection = page.locator("[data-e2e=object-inspection]");
    await expect(inspection).toBeVisible({ timeout: 30000 });
    await page.keyboard.press("Escape");
    await expect(inspection).toBeHidden();
    await expect(page.locator("canvas[data-drawn=hall]")).toBeVisible();
    await expect(page.locator("[data-e2e=toolbar]")).toBeVisible();
  });

  test("closing game window", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for Win95 desktop and game window
    await waitForGameWindowReady(page);

    // Verify game window is visible
    const gameWindow = page.locator("[data-e2e=win95-game-window]");
    await expect(gameWindow).toBeVisible();

    // Close the game window using helper
    await closeGameWindow(page);

    // Verify game window is no longer visible
    await expect(gameWindow).not.toBeVisible({ timeout: 5000 });

    // Taskbar should no longer show game button
    await expect(page.locator("[data-e2e=taskbar-game]")).not.toBeVisible();
  });

  test("toolbar keyboard navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for Win95 desktop and game window
    await waitForGameWindowReady(page);

    // Wait for welcome screen and dismiss it
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Dismiss welcome and wait for dialog
    const adventureDialog = await dismissWelcomeAndWaitForDialog(page);

    // Close the dialog by pressing Escape
    await page.keyboard.press("Escape");
    await expect(adventureDialog).toBeHidden({ timeout: 10000 });

    // Wait for game scene to be ready
    await expect(page.locator("[data-e2e=game-canvas]")).toBeVisible();
    await expect(page.locator("[data-e2e=toolbar]")).toBeVisible();

    // Focus the first toolbar button directly to start keyboard navigation
    const firstToolbarButton = page
      .locator("[data-e2e=toolbar-button]")
      .first();
    await firstToolbarButton.focus();

    // Verify focus is on the first toolbar button
    await expect(firstToolbarButton).toBeFocused();

    // Tab to next toolbar button
    await page.keyboard.press("Tab");
    const secondToolbarButton = page
      .locator("[data-e2e=toolbar-button]")
      .nth(1);
    await expect(secondToolbarButton).toBeFocused();

    // Navigate through a few more buttons to verify tab navigation works
    await page.keyboard.press("Tab");
    const thirdToolbarButton = page.locator("[data-e2e=toolbar-button]").nth(2);
    await expect(thirdToolbarButton).toBeFocused();
  });

  test("recycle bin window with career reject files", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for Win95 desktop
    await expect(page.locator("[data-e2e=win95-desktop]")).toBeVisible({
      timeout: 30000,
    });

    // Double-click the recycle bin desktop icon
    const recycleBinIcon = page.locator("[data-e2e=desktop-icon-recycle-bin]");
    await expect(recycleBinIcon).toBeVisible();
    await recycleBinIcon.dblclick();

    // Wait for recycle bin window to appear
    const recycleBinWindow = page
      .locator("[data-e2e=win95-window]")
      .filter({ hasText: "Recycle Bin" });
    await expect(recycleBinWindow).toBeVisible({ timeout: 5000 });

    // Verify taskbar shows recycle bin button
    await expect(page.locator("[data-e2e=taskbar-recycle-bin]")).toBeVisible();

    // Verify the file list contains the expected career reject files
    await expect(
      recycleBinWindow.getByText("my_patience_for_IE11.dll"),
    ).toBeVisible();
    await expect(
      recycleBinWindow.getByText("unnecessary_meetings.ics"),
    ).toBeVisible();
    await expect(
      recycleBinWindow.getByText("imposter_syndrome.exe"),
    ).toBeVisible();
    await expect(
      recycleBinWindow.getByText("promise_to_write_tests_later.todo"),
    ).toBeVisible();
    await expect(
      recycleBinWindow.getByText("tabs_vs_spaces_debate.txt"),
    ).toBeVisible();

    // Verify status bar shows "9 object(s)" and infinity symbol
    await expect(recycleBinWindow.getByText("9 object(s)")).toBeVisible();
    // Status bar has infinity KB - use first() to select the status section
    await expect(recycleBinWindow.getByText("∞ KB").last()).toBeVisible();

    // Take screenshot of the recycle bin window
    await expect(recycleBinWindow).toHaveScreenshot("07-recycle-bin.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
      timeout: 30000,
    });
  });
});
