import { test, expect, type Page } from "@playwright/test";

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

// Helper: Dismiss welcome screen and wait for dialog to appear
async function dismissWelcomeAndWaitForDialog(page: Page) {
  await page.keyboard.press("Space");
  const dialog = page.locator("[data-e2e=adventure-dialog]");
  await expect(dialog).toBeVisible({ timeout: 5000 });
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

  test("terminal screen - skills", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for Win95 desktop and game window
    await waitForGameWindowReady(page);

    // Wait for welcome screen and dismiss it
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Dismiss welcome screen and wait for dialog
    const adventureDialog = await dismissWelcomeAndWaitForDialog(page);

    // Close the dialog by pressing Escape
    await page.keyboard.press("Escape");
    await expect(adventureDialog).toBeHidden({ timeout: 10000 });

    // Wait for game scene to be ready
    await expect(page.locator("[data-e2e=game-canvas]")).toBeVisible();
    await expect(page.locator("[data-e2e=toolbar]")).toBeVisible();

    // Click on the Skills button in the toolbar to open the terminal screen
    const skillsButton = page.getByTitle("Skills");
    await expect(skillsButton).toBeVisible({ timeout: 5000 });
    await skillsButton.click();

    // Wait for terminal screen to appear (replaces game canvas inside game window)
    const terminalScreen = page.locator("[data-e2e=terminal-screen]");
    await expect(terminalScreen).toBeVisible({ timeout: 15000 });

    // Verify terminal screen content is loaded (after boot sequence)
    await expect(page.locator("[data-e2e=terminal-screen-title]")).toBeVisible({
      timeout: 30000,
    });
    await expect(
      page.locator("[data-e2e=terminal-screen-content]"),
    ).toBeVisible({ timeout: 10000 });

    // Allow rendering to stabilize (boot animation + content)
    await page.waitForTimeout(1500);

    await expect(page).toHaveScreenshot("04-terminal-screen-skills.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
      timeout: 30000,
    });
  });

  test("terminal screen - skills pagination", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await waitForGameWindowReady(page);
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });
    const adventureDialog = await dismissWelcomeAndWaitForDialog(page);
    await page.keyboard.press("Escape");
    await expect(adventureDialog).toBeHidden({ timeout: 10000 });

    await expect(page.locator("[data-e2e=game-canvas]")).toBeVisible();

    // Open Skills terminal screen
    await page.getByTitle("Skills").click();
    const terminalScreen = page.locator("[data-e2e=terminal-screen]");
    await expect(terminalScreen).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator("[data-e2e=terminal-screen-content]"),
    ).toBeVisible({ timeout: 10000 });

    // Verify pagination is visible (skills has multiple pages)
    const pagination = page.locator("[data-e2e=terminal-screen-pagination]");
    await expect(pagination).toBeVisible();
    await expect(pagination).toContainText("1 / 5");

    // Navigate to page 2
    await page.keyboard.press("ArrowRight");
    await expect(pagination).toContainText("2 / 5");

    // Navigate to page 3
    await page.keyboard.press("ArrowRight");
    await expect(pagination).toContainText("3 / 5");

    // Navigate to last page
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(pagination).toContainText("5 / 5");

    // Should not go beyond last page
    await page.keyboard.press("ArrowRight");
    await expect(pagination).toContainText("5 / 5");

    // Navigate back
    await page.keyboard.press("ArrowLeft");
    await expect(pagination).toContainText("4 / 5");

    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot(
      "04b-terminal-screen-skills-page2.png",
      {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.02,
        timeout: 30000,
      },
    );
  });

  test("terminal screen - dismiss with escape", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await waitForGameWindowReady(page);
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });
    const adventureDialog = await dismissWelcomeAndWaitForDialog(page);
    await page.keyboard.press("Escape");
    await expect(adventureDialog).toBeHidden({ timeout: 10000 });

    await expect(page.locator("[data-e2e=game-canvas]")).toBeVisible();

    // Open Skills terminal screen
    await page.getByTitle("Skills").click();
    const terminalScreen = page.locator("[data-e2e=terminal-screen]");
    await expect(terminalScreen).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator("[data-e2e=terminal-screen-content]"),
    ).toBeVisible({ timeout: 10000 });

    // Dismiss with Escape
    await page.keyboard.press("Escape");
    await expect(terminalScreen).not.toBeVisible({ timeout: 5000 });

    // Game canvas should be visible again
    await expect(page.locator("[data-e2e=game-canvas]")).toBeVisible({
      timeout: 5000,
    });
  });

  test("terminal screen - experience", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await waitForGameWindowReady(page);
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });
    const adventureDialog = await dismissWelcomeAndWaitForDialog(page);
    await page.keyboard.press("Escape");
    await expect(adventureDialog).toBeHidden({ timeout: 10000 });

    await expect(page.locator("[data-e2e=game-canvas]")).toBeVisible();

    // Open Experience terminal screen
    await page.getByTitle("Experience").click();
    const terminalScreen = page.locator(
      "[data-e2e=terminal-screen][data-action=experience]",
    );
    await expect(terminalScreen).toBeVisible({ timeout: 15000 });
    await expect(page.locator("[data-e2e=terminal-screen-title]")).toBeVisible({
      timeout: 30000,
    });

    await page.waitForTimeout(1500);

    await expect(page).toHaveScreenshot("04c-terminal-screen-experience.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
      timeout: 30000,
    });
  });

  test("terminal screen - about", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await waitForGameWindowReady(page);
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });
    const adventureDialog = await dismissWelcomeAndWaitForDialog(page);
    await page.keyboard.press("Escape");
    await expect(adventureDialog).toBeHidden({ timeout: 10000 });

    await expect(page.locator("[data-e2e=game-canvas]")).toBeVisible();

    // Open About terminal screen
    await page.getByTitle("About").click();
    const terminalScreen = page.locator(
      "[data-e2e=terminal-screen][data-action=about]",
    );
    await expect(terminalScreen).toBeVisible({ timeout: 15000 });
    await expect(page.locator("[data-e2e=terminal-screen-title]")).toBeVisible({
      timeout: 30000,
    });

    await page.waitForTimeout(1500);

    await expect(page).toHaveScreenshot("04d-terminal-screen-about.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
      timeout: 30000,
    });
  });

  test("terminal screen - contact", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await waitForGameWindowReady(page);
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });
    const adventureDialog = await dismissWelcomeAndWaitForDialog(page);
    await page.keyboard.press("Escape");
    await expect(adventureDialog).toBeHidden({ timeout: 10000 });

    await expect(page.locator("[data-e2e=game-canvas]")).toBeVisible();

    // Open Contact terminal screen
    await page.getByTitle("Contact").click();
    const terminalScreen = page.locator(
      "[data-e2e=terminal-screen][data-action=contact]",
    );
    await expect(terminalScreen).toBeVisible({ timeout: 15000 });
    await expect(page.locator("[data-e2e=terminal-screen-title]")).toBeVisible({
      timeout: 30000,
    });

    await page.waitForTimeout(1500);

    await expect(page).toHaveScreenshot("04e-terminal-screen-contact.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
      timeout: 30000,
    });
  });

  test("terminal screen - resume", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await waitForGameWindowReady(page);
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });
    const adventureDialog = await dismissWelcomeAndWaitForDialog(page);
    await page.keyboard.press("Escape");
    await expect(adventureDialog).toBeHidden({ timeout: 10000 });

    await expect(page.locator("[data-e2e=game-canvas]")).toBeVisible();

    // Open Resume terminal screen
    await page.getByTitle("Resume").click();
    const terminalScreen = page.locator(
      "[data-e2e=terminal-screen][data-action=resume]",
    );
    await expect(terminalScreen).toBeVisible({ timeout: 15000 });
    await expect(page.locator("[data-e2e=terminal-screen-title]")).toBeVisible({
      timeout: 30000,
    });

    await page.waitForTimeout(1500);

    await expect(page).toHaveScreenshot("04f-terminal-screen-resume.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
      timeout: 30000,
    });
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

  test("opening terminal window", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for Win95 desktop
    await expect(page.locator("[data-e2e=win95-desktop]")).toBeVisible({
      timeout: 30000,
    });

    // Double-click the terminal desktop icon to open terminal
    const terminalIcon = page.locator("[data-e2e=desktop-icon-terminal]");
    await expect(terminalIcon).toBeVisible();
    await terminalIcon.dblclick();

    // Wait for terminal window to appear
    const terminalWindow = page.locator("[data-e2e=win95-terminal-window]");
    await expect(terminalWindow).toBeVisible({ timeout: 5000 });

    // Verify terminal content is loaded
    await expect(page.locator("[data-e2e=terminal-input]")).toBeVisible();

    // Verify taskbar shows terminal button
    await expect(page.locator("[data-e2e=taskbar-terminal]")).toBeVisible();

    // Longer delay to ensure terminal is fully rendered
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot("05-terminal.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
      timeout: 30000,
    });
  });

  test("terminal overlayed on game window", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for Win95 desktop and game window to be ready
    await waitForGameWindowReady(page);

    // Wait for welcome screen and dismiss it to get to the game scene
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Dismiss welcome and wait for dialog
    const adventureDialog = await dismissWelcomeAndWaitForDialog(page);

    // Close dialog to show game scene
    await page.keyboard.press("Escape");
    await expect(adventureDialog).toBeHidden({ timeout: 10000 });

    // Verify game window is visible with scene
    await expect(page.locator("[data-e2e=game-canvas]")).toBeVisible();

    // Open terminal via desktop icon
    // The game window may cover the icon, so use dispatchEvent
    const terminalIcon = page.locator("[data-e2e=desktop-icon-terminal]");
    await expect(terminalIcon).toBeVisible();
    await terminalIcon.dispatchEvent("click");
    // Double-click is needed so dispatch another click
    await terminalIcon.dispatchEvent("click");

    // Wait for terminal window to appear
    const terminalWindow = page.locator("[data-e2e=win95-terminal-window]");
    await expect(terminalWindow).toBeVisible({ timeout: 5000 });

    // Both windows should be visible
    await expect(page.locator("[data-e2e=win95-game-window]")).toBeVisible();
    await expect(terminalWindow).toBeVisible();

    // Both taskbar buttons should be visible
    await expect(page.locator("[data-e2e=taskbar-game]")).toBeVisible();
    await expect(page.locator("[data-e2e=taskbar-terminal]")).toBeVisible();

    // Allow time for rendering
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot("06-terminal-overlay.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
      timeout: 30000,
    });
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

    // Allow time for rendering to stabilize
    await page.waitForTimeout(1000);

    // Take screenshot of the recycle bin window
    await expect(page).toHaveScreenshot("07-recycle-bin.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
      timeout: 30000,
    });
  });
});
