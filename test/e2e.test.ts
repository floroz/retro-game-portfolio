import { test, expect } from "@playwright/test";

// Ensure desktop viewport for all tests
test.use({
  viewport: { width: 1280, height: 720 },
});

test.describe("Portfolio E2E Tests", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");

    // Wait for the page to be fully loaded
    await expect(page).toHaveTitle(/Daniele Tortora/i);
  });

  test("should display the game canvas", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Wait for welcome screen first
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Dismiss welcome screen
    await page.keyboard.press("Space");

    // Wait for game canvas to appear
    const gameCanvas = page.locator("[data-e2e=game-canvas]");
    await expect(gameCanvas).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Visual Regression Tests", () => {
  test("welcome screen", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for welcome screen to be visible
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
    });
  });

  test("intro dialog with typewriter complete", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for welcome screen first
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Dismiss welcome screen
    await page.keyboard.press("Space");

    // Wait for the intro dialog to appear (300ms delay + dialog opening)
    const adventureDialog = page.locator("[data-e2e=adventure-dialog]");
    await expect(adventureDialog).toBeVisible({ timeout: 10000 });

    // Wait for dialog options to be visible (they only render when typing is complete)
    // Note: VITE_TYPEWRITER_SPEED=0 in E2E makes this instant
    const dialogOptions = page.locator("[data-e2e=dialog-options]");
    await expect(dialogOptions).toBeVisible({ timeout: 10000 });

    // Verify the option text is visible
    await expect(page.getByText("Nice to meet you!")).toBeVisible();

    // Allow browser to finish painting before screenshot
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("02-intro-dialog.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("game scene after dialog closed", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for welcome screen first
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Dismiss welcome screen
    await page.keyboard.press("Space");

    // Wait for the intro dialog to appear
    const adventureDialog = page.locator("[data-e2e=adventure-dialog]");
    await expect(adventureDialog).toBeVisible({ timeout: 10000 });

    // Wait for dialog options (typing complete - instant with VITE_TYPEWRITER_SPEED=0)
    await expect(page.locator("[data-e2e=dialog-options]")).toBeVisible({
      timeout: 10000,
    });

    // Close the dialog by pressing Escape
    await page.keyboard.press("Escape");

    // Wait for dialog to be gone
    await expect(adventureDialog).toBeHidden({ timeout: 10000 });

    // Wait for game scene to be fully visible
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
      timeout: 10000,
    });
  });

  test("content modal open", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for welcome screen and dismiss it
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Space");

    // Wait for intro dialog and for typewriter to complete
    const adventureDialog = page.locator("[data-e2e=adventure-dialog]");
    await expect(adventureDialog).toBeVisible({ timeout: 5000 });

    // Wait for dialog options (typing complete - instant with VITE_TYPEWRITER_SPEED=0)
    await expect(page.locator("[data-e2e=dialog-options]")).toBeVisible({
      timeout: 10000,
    });

    // Close the dialog by pressing Escape
    await page.keyboard.press("Escape");
    await expect(adventureDialog).toBeHidden({ timeout: 10000 });

    // Wait for game scene to be ready
    await expect(page.locator("[data-e2e=game-canvas]")).toBeVisible();
    await expect(page.locator("[data-e2e=toolbar]")).toBeVisible();

    // Click on the Skills button in the toolbar to open the modal
    const skillsButton = page.getByTitle("Skills");
    await expect(skillsButton).toBeVisible({ timeout: 5000 });
    await skillsButton.click();

    // Wait for modal to appear
    const modal = page.locator("[data-e2e=modal]");
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Verify modal content is loaded
    await expect(page.locator("[data-e2e=modal-title]")).toBeVisible();
    await expect(page.locator("[data-e2e=modal-content]")).toBeVisible();

    await expect(page).toHaveScreenshot("04-content-modal.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("terminal open", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for welcome screen and dismiss it
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Space");

    // Wait for intro dialog and typewriter to complete
    const adventureDialog = page.locator("[data-e2e=adventure-dialog]");
    await expect(adventureDialog).toBeVisible({ timeout: 5000 });

    // Wait for dialog options (typing complete - instant with VITE_TYPEWRITER_SPEED=0)
    await expect(page.locator("[data-e2e=dialog-options]")).toBeVisible({
      timeout: 10000,
    });

    // Close the dialog by pressing Escape
    await page.keyboard.press("Escape");
    await expect(adventureDialog).toBeHidden({ timeout: 10000 });

    // Wait for game scene to be ready
    await expect(page.locator("[data-e2e=game-canvas]")).toBeVisible();
    await expect(page.locator("[data-e2e=toolbar]")).toBeVisible();

    // Open terminal by clicking the Terminal button (more reliable than backtick)
    const terminalButton = page.getByRole("button", { name: "Terminal" });
    await expect(terminalButton).toBeVisible({ timeout: 5000 });
    await terminalButton.click();

    // Wait for terminal to appear
    const terminal = page.locator("[data-e2e=terminal]");
    await expect(terminal).toBeVisible({ timeout: 5000 });

    // Verify terminal content is loaded
    await expect(page.locator("[data-e2e=terminal-input]")).toBeVisible();

    // Longer delay to ensure terminal is fully rendered (especially for webkit)
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot("05-terminal.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
      timeout: 10000,
    });
  });

  test("toolbar keyboard navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for welcome screen and dismiss it
    const welcomeScreen = page.locator("[data-e2e=welcome-screen]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Space");

    // Wait for intro dialog and typewriter to complete, then close
    const adventureDialog = page.locator("[data-e2e=adventure-dialog]");
    await expect(adventureDialog).toBeVisible({ timeout: 5000 });

    // Wait for dialog options (typing complete - instant with VITE_TYPEWRITER_SPEED=0)
    await expect(page.locator("[data-e2e=dialog-options]")).toBeVisible({
      timeout: 10000,
    });

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

    // Verify we can navigate through all toolbar buttons
    // Press Tab multiple times to navigate through toolbar
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
    }

    // Verify focus is still on a toolbar element
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toHaveAttribute("data-e2e", "toolbar-button");
  });
});
