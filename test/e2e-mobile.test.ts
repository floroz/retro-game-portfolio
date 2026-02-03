import { test as base, expect, devices, type Page } from "@playwright/test";

// Extend base test with iPhone 12 configuration for mobile tests
const test = base.extend({
  viewport: devices["iPhone 12"].viewport,
  userAgent: devices["iPhone 12"].userAgent,
  deviceScaleFactor: devices["iPhone 12"].deviceScaleFactor,
  isMobile: devices["iPhone 12"].isMobile,
  hasTouch: devices["iPhone 12"].hasTouch,
});

// Helper to dismiss BIOS screen if present
async function dismissBiosIfPresent(page: Page) {
  const biosOverlay = page.locator("[data-e2e=bios-overlay]");
  const isVisible = await biosOverlay
    .isVisible({ timeout: 1000 })
    .catch(() => false);
  if (isVisible) {
    await biosOverlay.tap();
    await expect(biosOverlay).not.toBeVisible();
  }
}

test.describe("Mobile Portfolio E2E Tests", () => {
  test("should show mobile ASCII welcome screen", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const welcomeScreen = page.locator("[data-e2e=mobile-ascii-welcome]");
    await expect(welcomeScreen).toBeVisible({ timeout: 10000 });

    // Verify name and title are visible
    await expect(welcomeScreen).toContainText("Daniele Tortora");
    await expect(welcomeScreen).toContainText("Senior Software Engineer");

    // Verify tap hint
    await expect(page.getByText("Tap anywhere to continue")).toBeVisible();
  });

  test("should show BIOS screen on first load", async ({ page }) => {
    // Clear session storage to ensure BIOS shows
    await page.goto("/");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();

    // Dismiss welcome screen
    const welcomeScreen = page.locator("[data-e2e=mobile-ascii-welcome]");
    await expect(welcomeScreen).toBeVisible();
    await welcomeScreen.tap();

    // BIOS overlay should appear
    const biosOverlay = page.locator("[data-e2e=bios-overlay]");
    await expect(biosOverlay).toBeVisible({ timeout: 2000 });

    // Verify BIOS content
    await expect(biosOverlay).toContainText("SYSTEM INITIALIZATION");
    await expect(biosOverlay).toContainText("MOBILE EXPERIENCE OPTIMIZED");
    await expect(biosOverlay).toContainText("Press any key to continue");

    // Dismiss BIOS
    await biosOverlay.tap();
    await expect(biosOverlay).not.toBeVisible();

    // Terminal should be visible
    await expect(page.locator("[data-e2e=mobile-terminal]")).toBeVisible();
  });

  test("should not show BIOS on subsequent loads in same session", async ({
    page,
  }) => {
    await page.goto("/");

    // Dismiss welcome
    const welcomeScreen = page.locator("[data-e2e=mobile-ascii-welcome]");
    await welcomeScreen.tap();

    // Dismiss BIOS if it appears
    await dismissBiosIfPresent(page);

    // Navigate away and back
    await page.goto("/about");
    await page.goto("/");

    // Dismiss welcome again
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();

    // BIOS should NOT appear
    const biosOverlay = page.locator("[data-e2e=bios-overlay]");
    await expect(biosOverlay).not.toBeVisible({ timeout: 1000 });
  });

  test("should dismiss ASCII welcome with tap and show terminal", async ({
    page,
  }) => {
    await page.goto("/");

    const welcomeScreen = page.locator("[data-e2e=mobile-ascii-welcome]");
    await expect(welcomeScreen).toBeVisible();
    await welcomeScreen.tap();

    // Dismiss BIOS if present
    await dismissBiosIfPresent(page);

    // Mobile terminal should be visible
    const terminal = page.locator("[data-e2e=mobile-terminal]");
    await expect(terminal).toBeVisible({ timeout: 5000 });

    // ASCII art should be in terminal history
    await expect(terminal).toContainText("DANIELE TORTORA");
    await expect(terminal).toContainText("Senior Software Engineer");

    // Intro dialog should start automatically
    await expect(page.getByText(/Well, well, well/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show terminal footer with hint and copyright", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Footer should be visible
    const footer = page.locator("[data-e2e=terminal-footer]");
    await expect(footer).toBeVisible();

    // Verify hint text
    await expect(footer).toContainText("Type help for all commands");
    await expect(footer).toContainText("swipe up");

    // Verify copyright
    await expect(footer).toContainText("© 2026 Daniele Tortora");
  });

  test("should open desktop overlay when tapping footer", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Tap footer to open desktop
    const footer = page.locator("[data-e2e=terminal-footer]");
    await footer.tap();

    // Desktop overlay should appear
    const desktop = page.locator("[data-e2e=mobile-desktop]");
    await expect(desktop).toBeVisible({ timeout: 2000 });

    // Verify desktop title
    await expect(desktop).toContainText("DANIELE'S DESKTOP");
  });

  test("should open desktop overlay with swipe up gesture", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Get viewport height
    const viewportSize = page.viewportSize();
    const height = viewportSize?.height || 844;

    // Simulate swipe up from bottom
    await page.touchscreen.tap(200, height - 50); // Touch start near bottom
    await page.mouse.move(200, height - 50);
    await page.mouse.down();
    await page.mouse.move(200, height - 200); // Swipe up 150px
    await page.mouse.up();

    // Desktop overlay should appear
    const desktop = page.locator("[data-e2e=mobile-desktop]");
    await expect(desktop).toBeVisible({ timeout: 2000 });
  });

  test("should show desktop icons and handle command selection", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Open desktop
    await page.locator("[data-e2e=terminal-footer]").tap();
    const desktop = page.locator("[data-e2e=mobile-desktop]");
    await expect(desktop).toBeVisible();

    // Verify icons are present
    await expect(desktop.getByText("ABOUT.EXE")).toBeVisible();
    await expect(desktop.getByText("EXPERIENCE.EXE")).toBeVisible();
    await expect(desktop.getByText("SKILLS.EXE")).toBeVisible();
    await expect(desktop.getByText("PROJECTS.EXE")).toBeVisible();
    await expect(desktop.getByText("CONTACT.EXE")).toBeVisible();
    await expect(desktop.getByText("TALK.EXE")).toBeVisible();

    // Tap an icon (e.g., TALK which outputs to terminal)
    await desktop.getByText("TALK.EXE").tap();

    // Desktop should close
    await expect(desktop).not.toBeVisible({ timeout: 2000 });

    // TALK command should execute - dialog should appear
    await expect(page.getByText(/Well, well, well/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test("should close desktop overlay with X button", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Open desktop
    await page.locator("[data-e2e=terminal-footer]").tap();
    const desktop = page.locator("[data-e2e=mobile-desktop]");
    await expect(desktop).toBeVisible();

    // Click close button
    const closeButton = desktop.locator("button[aria-label*='Close']");
    await closeButton.tap();

    // Desktop should close
    await expect(desktop).not.toBeVisible({ timeout: 1000 });
  });

  test("should start with intro dialog after welcome", async ({ page }) => {
    await page.goto("/");

    // Dismiss welcome
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Wait for intro dialog message
    await expect(page.getByText(/Well, well, well/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show dialog options after typewriter completes", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Wait for options to appear (text-based options now)
    await expect(
      page
        .locator("[data-e2e=dialog-option]")
        .filter({ hasText: /Nice to meet you!/i }),
    ).toBeVisible({
      timeout: 15000, // Increased timeout for typewriter
    });
  });

  test("should navigate dialog via option tap", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Wait for first option
    const option = page
      .locator("[data-e2e=dialog-option]")
      .filter({ hasText: /Nice to meet you!/i });
    await expect(option).toBeVisible({ timeout: 15000 });

    // Tap option
    await option.tap();

    // Verify navigation to next dialog node
    await expect(
      page
        .locator("[data-e2e=dialog-agent-message]")
        .filter({ hasText: /what quest brings you here/i })
        .last(),
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("should navigate dialog via numeric input", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Wait for options
    await expect(
      page
        .locator("[data-e2e=dialog-option]")
        .filter({ hasText: /Nice to meet you!/i }),
    ).toBeVisible({
      timeout: 15000,
    });

    // Type "1" in input and submit
    const input = page.locator("input[type=text]");
    await input.fill("1");
    await input.press("Enter");

    // Verify navigation (check in terminal output)
    await expect(
      page
        .locator("[data-e2e=dialog-agent-message]")
        .filter({ hasText: /what quest brings you here/i })
        .last(),
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("should persist conversation history in terminal", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Wait for first message
    const firstMsg = page
      .locator("[data-e2e=dialog-agent-message]")
      .filter({ hasText: /Well, well, well/i });
    await expect(firstMsg.first()).toBeVisible({ timeout: 15000 });

    // Select option
    const option = page
      .locator("[data-e2e=dialog-option]")
      .filter({ hasText: /Nice to meet you!/i });
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.tap();

    // Wait for second message
    const secondMsg = page
      .locator("[data-e2e=dialog-agent-message]")
      .filter({ hasText: /what quest brings you here/i });
    await expect(secondMsg.first()).toBeVisible({ timeout: 15000 });

    // Both messages should still be visible in history
    await expect(firstMsg.first()).toBeVisible();
  });

  test("should handle orientation change", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Wait for terminal
    await expect(page.locator("[data-e2e=mobile-terminal]")).toBeVisible();

    // Simulate orientation change (landscape)
    await page.setViewportSize({ width: 844, height: 390 });

    // Terminal should still be visible and functional
    await expect(page.locator("[data-e2e=mobile-terminal]")).toBeVisible();
  });
});

test.describe("Mobile Visual Regression Tests", () => {
  test("mobile ASCII welcome screen", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const welcomeScreen = page.locator("[data-e2e=mobile-ascii-welcome]");
    await expect(welcomeScreen).toBeVisible();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("00-mobile-ascii-welcome.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("mobile BIOS screen", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();

    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    const biosOverlay = page.locator("[data-e2e=bios-overlay]");
    await expect(biosOverlay).toBeVisible({ timeout: 2000 });
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("01-mobile-bios.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("mobile terminal with intro dialog", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Wait for dialog to appear
    await expect(page.getByText(/Well, well, well/i)).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("02-mobile-terminal-intro.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("mobile terminal with options", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Wait for options
    await expect(
      page
        .locator("[data-e2e=dialog-option]")
        .filter({ hasText: /Nice to meet you!/i }),
    ).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("03-mobile-terminal-options.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("mobile terminal with conversation history", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Navigate through dialog
    await expect(
      page
        .locator("[data-e2e=dialog-option]")
        .filter({ hasText: /Nice to meet you!/i }),
    ).toBeVisible({
      timeout: 15000,
    });
    await page
      .locator("[data-e2e=dialog-option]")
      .filter({ hasText: /Nice to meet you!/i })
      .tap();

    // Wait for second message
    await expect(
      page
        .locator("[data-e2e=dialog-agent-message]")
        .filter({ hasText: /what quest brings you here/i })
        .last(),
    ).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("04-mobile-terminal-history.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("mobile desktop overlay", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Open desktop
    await page.locator("[data-e2e=terminal-footer]").tap();
    const desktop = page.locator("[data-e2e=mobile-desktop]");
    await expect(desktop).toBeVisible();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("05-mobile-desktop-overlay.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });
});

// Tablet tests with different device configuration
const tabletTest = base.extend({
  viewport: devices["iPad Pro 11"].viewport,
  userAgent: devices["iPad Pro 11"].userAgent,
  deviceScaleFactor: devices["iPad Pro 11"].deviceScaleFactor,
  isMobile: devices["iPad Pro 11"].isMobile,
  hasTouch: devices["iPad Pro 11"].hasTouch,
});

tabletTest.describe("Mobile Tablet Tests", () => {
  tabletTest("tablet ASCII welcome screen", async ({ page }) => {
    await page.goto("/");

    const welcomeScreen = page.locator("[data-e2e=mobile-ascii-welcome]");
    await expect(welcomeScreen).toBeVisible();

    await expect(page).toHaveScreenshot("06-tablet-welcome.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  tabletTest("tablet terminal functionality", async ({ page }) => {
    await page.goto("/");

    // Dismiss welcome
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Terminal should be visible
    const terminal = page.locator("[data-e2e=mobile-terminal]");
    await expect(terminal).toBeVisible({ timeout: 5000 });

    // Wait for intro dialog
    await expect(page.getByText(/Well, well, well/i)).toBeVisible({
      timeout: 15000,
    });
  });
});

test.describe("Mobile Accessibility Tests", () => {
  test("terminal output has proper ARIA attributes", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    const output = page.locator("[data-e2e=terminal-output]");
    await expect(output).toHaveAttribute("role", "log");
    await expect(output).toHaveAttribute("aria-live", "polite");
  });

  test("dialog options have proper accessibility attributes", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    // Wait for options
    const option = page
      .locator("[data-e2e=dialog-option]")
      .filter({ hasText: /Nice to meet you!/i });
    await expect(option).toBeVisible({ timeout: 15000 });

    // Check accessibility attributes
    await expect(option).toHaveAttribute("role", "button");
    await expect(option).toHaveAttribute("tabIndex", "0");
  });

  test("input field has proper attributes", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    const input = page.locator("[data-e2e=terminal-input]");
    await expect(input).toHaveAttribute("aria-label", "Terminal input");
    await expect(input).toHaveAttribute("spellcheck", "false");
    await expect(input).toHaveAttribute("autocomplete", "off");
  });

  test("terminal footer has proper accessibility", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-e2e=mobile-ascii-welcome]").tap();
    await dismissBiosIfPresent(page);

    const footer = page.locator("[data-e2e=terminal-footer]");
    await expect(footer).toHaveAttribute("role", "button");
    await expect(footer).toHaveAttribute("tabIndex", "0");
    await expect(footer).toHaveAttribute("aria-label", "Open desktop overlay");
  });
});
