import { test, expect } from "@playwright/test";

// Ensure desktop viewport for all tests
test.use({
  viewport: { width: 1280, height: 720 },
});

test.describe("Portfolio E2E Tests", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");

    // Wait for the page to be fully loaded
    await expect(page).toHaveTitle(/portfolio/i);
  });

  test("should display the game canvas", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for welcome screen first
    const welcomeScreen = page.locator(".welcome-screen");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Dismiss welcome screen
    await page.keyboard.press("Space");

    // Wait for game canvas to appear
    const gameCanvas = page.locator(".game-canvas");
    await expect(gameCanvas).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Visual Regression Tests", () => {
  test("welcome screen", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for welcome screen to be visible (use class selector)
    const welcomeScreen = page.locator(".welcome-screen");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Wait for content to be fully rendered
    await expect(page.locator(".welcome-screen__name")).toBeVisible();
    await expect(page.locator(".welcome-screen__title")).toBeVisible();
    await expect(page.locator(".welcome-screen__prompt")).toBeVisible();

    // Small delay to ensure all CSS animations have settled
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("01-welcome-screen.png", {
      fullPage: true,
    });
  });

  test("intro dialog with typewriter complete", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for welcome screen first
    const welcomeScreen = page.locator(".welcome-screen");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Dismiss welcome screen
    await page.keyboard.press("Space");

    // Wait for the intro dialog to appear (300ms delay + dialog opening)
    const adventureDialog = page.locator(".adventure-dialog");
    await expect(adventureDialog).toBeVisible({ timeout: 5000 });

    // Wait for typewriter to complete by checking for the options to appear
    // Options only show after typing is complete
    const dialogOptions = page.locator(".dialog-options");
    await expect(dialogOptions).toBeVisible({ timeout: 15000 });

    // Verify the "Nice to meet you!" option is visible (confirms typewriter done)
    await expect(page.getByText("Nice to meet you!")).toBeVisible();

    await expect(page).toHaveScreenshot("02-intro-dialog.png", {
      fullPage: true,
    });
  });

  test("game scene after dialog closed", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for welcome screen first
    const welcomeScreen = page.locator(".welcome-screen");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Dismiss welcome screen
    await page.keyboard.press("Space");

    // Wait for the intro dialog to appear
    const adventureDialog = page.locator(".adventure-dialog");
    await expect(adventureDialog).toBeVisible({ timeout: 5000 });

    // Wait for typewriter to complete
    const dialogOptions = page.locator(".dialog-options");
    await expect(dialogOptions).toBeVisible({ timeout: 15000 });

    // Close the dialog by pressing Escape
    await page.keyboard.press("Escape");

    // Wait for dialog to close
    await expect(adventureDialog).not.toBeVisible();

    // Wait for game scene to be fully visible
    const gameCanvas = page.locator(".game-canvas");
    await expect(gameCanvas).toBeVisible();

    // Wait for scene elements to load
    await expect(page.locator(".scene")).toBeVisible();
    await expect(page.locator(".toolbar")).toBeVisible();

    // Small delay to ensure scene is fully rendered
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("03-game-scene.png", {
      fullPage: true,
    });
  });

  test("content modal open", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for welcome screen and dismiss it
    const welcomeScreen = page.locator(".welcome-screen");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Space");

    // Wait for intro dialog and close it
    const adventureDialog = page.locator(".adventure-dialog");
    await expect(adventureDialog).toBeVisible({ timeout: 5000 });
    const dialogOptions = page.locator(".dialog-options");
    await expect(dialogOptions).toBeVisible({ timeout: 15000 });
    await page.keyboard.press("Escape");
    await expect(adventureDialog).not.toBeVisible();

    // Wait for game scene to be ready
    await expect(page.locator(".game-canvas")).toBeVisible();

    // Click on the Skills button in the toolbar to open the modal
    await page.getByTitle("Skills").click();

    // Wait for modal to appear
    const modal = page.locator(".modal");
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify modal content is loaded
    await expect(page.locator(".modal__title")).toBeVisible();
    await expect(page.locator(".modal__content")).toBeVisible();

    await expect(page).toHaveScreenshot("04-content-modal.png", {
      fullPage: true,
    });
  });

  test("terminal open", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for welcome screen and dismiss it
    const welcomeScreen = page.locator(".welcome-screen");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Space");

    // Wait for intro dialog and close it
    const adventureDialog = page.locator(".adventure-dialog");
    await expect(adventureDialog).toBeVisible({ timeout: 5000 });
    const dialogOptions = page.locator(".dialog-options");
    await expect(dialogOptions).toBeVisible({ timeout: 15000 });
    await page.keyboard.press("Escape");
    await expect(adventureDialog).not.toBeVisible();

    // Wait for game scene to be ready
    await expect(page.locator(".game-canvas")).toBeVisible();

    // Open terminal with backtick key
    await page.keyboard.press("`");

    // Wait for terminal to appear
    const terminal = page.locator(".terminal");
    await expect(terminal).toBeVisible({ timeout: 5000 });

    // Verify terminal content is loaded
    await expect(page.locator(".terminal__input")).toBeVisible();

    // Small delay to ensure terminal is fully rendered
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("05-terminal.png", {
      fullPage: true,
    });
  });
});
