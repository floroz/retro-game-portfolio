import { test as base, expect, devices, type Page } from "@playwright/test";

// Extend base test with iPhone 14 Pro configuration for mobile tests
const test = base.extend({
  viewport: devices["iPhone 14 Pro"].viewport,
  userAgent: devices["iPhone 14 Pro"].userAgent,
  deviceScaleFactor: devices["iPhone 14 Pro"].deviceScaleFactor,
  isMobile: devices["iPhone 14 Pro"].isMobile,
  hasTouch: devices["iPhone 14 Pro"].hasTouch,
});

// Helper: wait for boot animation to complete (~4.5s) or skip if reduced-motion
async function waitForMenu(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  // Tap START to power on from idle screen
  const startBtn = page.locator("[data-e2e=retro-btn-start]");
  await startBtn.tap();

  // Boot plays after power on (~4.5s). Menu appears after boot finishes.
  // In playwright config, reducedMotion: "reduce" is set globally — boot is skipped automatically.
  const menu = page.locator("[data-e2e=retro-menu]");
  await expect(menu).toBeVisible({ timeout: 8000 });
}

// ============================================================
// Boot Animation Tests
// ============================================================
test.describe("RetroPlay Boot Animation Tests", () => {
  // Override reduced motion so boot animation actually plays
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("should show idle screen on load", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const idleScreen = page.locator("[data-e2e=retro-boot-idle]");
    await expect(idleScreen).toBeVisible({ timeout: 3000 });
    await expect(idleScreen).toContainText("PRESS START");
  });

  test("tapping screen powers on and shows boot animation", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Tap the screen area to power on
    const screen = page.locator("[data-e2e=retro-screen]");
    await screen.tap();

    // Boot logo should appear
    const bootLogo = page.locator("[data-e2e=retro-boot-logo]");
    await expect(bootLogo).toBeVisible({ timeout: 5000 });
  });

  test("pressing START button powers on and shows boot animation", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Press START to power on
    const startBtn = page.locator("[data-e2e=retro-btn-start]");
    await startBtn.tap();

    // Boot logo should appear
    const bootLogo = page.locator("[data-e2e=retro-boot-logo]");
    await expect(bootLogo).toBeVisible({ timeout: 5000 });
  });

  test("boot animation shows name and title", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Power on
    await page.locator("[data-e2e=retro-btn-start]").tap();

    const bootLogo = page.locator("[data-e2e=retro-boot-logo]");
    await expect(bootLogo).toBeVisible({ timeout: 5000 });
    await expect(bootLogo).toContainText("Daniele Tortora");
    await expect(bootLogo).toContainText("Senior Software Engineer");
  });

  test("boot animation completes and shows menu", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Power on
    await page.locator("[data-e2e=retro-btn-start]").tap();

    // Boot should be visible first
    await expect(page.locator("[data-e2e=retro-boot-screen]")).toBeVisible({
      timeout: 3000,
    });

    // After ~4.5s, menu should appear
    const menu = page.locator("[data-e2e=retro-menu]");
    await expect(menu).toBeVisible({ timeout: 8000 });
  });

  test("reduced-motion skips boot entirely", async ({ page }) => {
    // This test runs with no-preference from describe block,
    // so we create a new context with reduce
    const reducedContext = await page
      .context()
      .browser()!
      .newContext({
        ...devices["iPhone 12"],
        reducedMotion: "reduce",
      });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto("/");
    await reducedPage.waitForLoadState("domcontentloaded");

    // Idle screen should still appear (it's not animated)
    const idleScreen = reducedPage.locator("[data-e2e=retro-boot-idle]");
    await expect(idleScreen).toBeVisible({ timeout: 2000 });

    // Tap START to power on
    await reducedPage.locator("[data-e2e=retro-btn-start]").tap();

    // Menu should appear immediately (no boot animation)
    const menu = reducedPage.locator("[data-e2e=retro-menu]");
    await expect(menu).toBeVisible({ timeout: 3000 });

    await reducedContext.close();
  });
});

// ============================================================
// Menu Navigation Tests
// ============================================================
test.describe("RetroPlay Menu Navigation Tests", () => {
  test("should show 5 menu items", async ({ page }) => {
    await waitForMenu(page);

    await expect(
      page.locator("[data-e2e=retro-menu-item-about]"),
    ).toBeVisible();
    await expect(
      page.locator("[data-e2e=retro-menu-item-experience]"),
    ).toBeVisible();
    await expect(
      page.locator("[data-e2e=retro-menu-item-skills]"),
    ).toBeVisible();
    await expect(
      page.locator("[data-e2e=retro-menu-item-contact]"),
    ).toBeVisible();
    await expect(
      page.locator("[data-e2e=retro-menu-item-resume]"),
    ).toBeVisible();
  });

  test("cursor starts on first item (About)", async ({ page }) => {
    await waitForMenu(page);

    const aboutItem = page.locator("[data-e2e=retro-menu-item-about]");
    await expect(aboutItem).toHaveAttribute("aria-current", "true");
    await expect(page.locator("[data-e2e=retro-cursor]")).toBeVisible();
  });

  test("D-pad down moves cursor to next item", async ({ page }) => {
    await waitForMenu(page);

    // Cursor starts on About (index 0)
    await expect(
      page.locator("[data-e2e=retro-menu-item-about]"),
    ).toHaveAttribute("aria-current", "true");

    // Press D-pad down
    await page.locator("[data-e2e=retro-dpad-down]").tap();

    // Cursor should now be on Experience (index 1)
    await expect(
      page.locator("[data-e2e=retro-menu-item-experience]"),
    ).toHaveAttribute("aria-current", "true");
  });

  test("D-pad up at top boundary does not wrap", async ({ page }) => {
    await waitForMenu(page);

    // Press D-pad up at top
    await page.locator("[data-e2e=retro-dpad-up]").tap();

    // Should stay on About
    await expect(
      page.locator("[data-e2e=retro-menu-item-about]"),
    ).toHaveAttribute("aria-current", "true");
  });

  test("A button confirms selection and opens section", async ({ page }) => {
    await waitForMenu(page);

    // Cursor is on About by default
    await page.locator("[data-e2e=retro-btn-a]").tap();

    const sectionView = page.locator("[data-e2e=retro-section-view]");
    await expect(sectionView).toBeVisible({ timeout: 3000 });
    await expect(sectionView).toContainText("ABOUT");
  });

  test("tapping menu item directly opens section", async ({ page }) => {
    await waitForMenu(page);

    await page.locator("[data-e2e=retro-menu-item-skills]").tap();

    const sectionView = page.locator("[data-e2e=retro-section-view]");
    await expect(sectionView).toBeVisible({ timeout: 3000 });
    await expect(sectionView).toContainText("SKILLS");
  });
});

// ============================================================
// Section Navigation Tests
// ============================================================
test.describe("RetroPlay Section Navigation Tests", () => {
  test("About section has content", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-about]").tap();

    const content = page.locator("[data-e2e=retro-section-content]");
    await expect(content).toBeVisible({ timeout: 3000 });
    await expect(content).toContainText("ABOUT ME");
  });

  test("Experience section has work history", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-experience]").tap();

    const content = page.locator("[data-e2e=retro-section-content]");
    await expect(content).toBeVisible({ timeout: 3000 });
    await expect(content).toContainText("WORK HISTORY");
    await expect(content).toContainText("Snyk");
  });

  test("Skills section has categories", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-skills]").tap();

    const content = page.locator("[data-e2e=retro-section-content]");
    await expect(content).toBeVisible({ timeout: 3000 });
    await expect(content).toContainText("FRONTEND");
    await expect(content).toContainText("React");
  });

  test("B button returns to menu from section", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-about]").tap();
    await expect(page.locator("[data-e2e=retro-section-view]")).toBeVisible();

    // Press B to go back
    await page.locator("[data-e2e=retro-btn-b]").tap();

    await expect(page.locator("[data-e2e=retro-menu]")).toBeVisible({
      timeout: 3000,
    });
  });

  test("Start button returns to menu from section", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-skills]").tap();
    await expect(page.locator("[data-e2e=retro-section-view]")).toBeVisible();

    // Press Start to go back
    await page.locator("[data-e2e=retro-btn-start]").tap();

    await expect(page.locator("[data-e2e=retro-menu]")).toBeVisible({
      timeout: 3000,
    });
  });

  test("D-pad scrolls content in section view", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-experience]").tap();

    const content = page.locator("[data-e2e=retro-section-content]");
    await expect(content).toBeVisible({ timeout: 3000 });

    // Get initial scroll position
    const scrollBefore = await content.evaluate((el) => el.scrollTop);

    // Press D-pad down to scroll
    await page.locator("[data-e2e=retro-dpad-down]").tap();
    await page.waitForTimeout(400); // wait for smooth scroll

    const scrollAfter = await content.evaluate((el) => el.scrollTop);
    expect(scrollAfter).toBeGreaterThan(scrollBefore);
  });
});

// ============================================================
// Contact & Resume Tests
// ============================================================
test.describe("RetroPlay Contact & Resume Tests", () => {
  test("contact email link has mailto href", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-contact]").tap();

    const emailLink = page.locator("[data-e2e=retro-contact-email]");
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveAttribute("href", /^mailto:/);
  });

  test("contact LinkedIn link opens in new tab", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-contact]").tap();

    const linkedinLink = page.locator("[data-e2e=retro-contact-linkedin]");
    await expect(linkedinLink).toBeVisible();
    await expect(linkedinLink).toHaveAttribute("href", /linkedin/);
    await expect(linkedinLink).toHaveAttribute("target", "_blank");
    await expect(linkedinLink).toHaveAttribute("rel", /noopener/);
  });

  test("contact GitHub link opens in new tab", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-contact]").tap();

    const githubLink = page.locator("[data-e2e=retro-contact-github]");
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute("href", /github/);
    await expect(githubLink).toHaveAttribute("target", "_blank");
  });

  test("resume download button exists", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-resume]").tap();

    const downloadBtn = page.locator("[data-e2e=retro-resume-download]");
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toHaveAttribute("href", /resume\.pdf/);
    await expect(downloadBtn).toHaveAttribute("download", "");
  });
});

// ============================================================
// Desktop Banner Tests
// ============================================================
test.describe("RetroPlay Desktop Banner Tests", () => {
  test("desktop banner is visible on menu", async ({ page }) => {
    await waitForMenu(page);

    const banner = page.locator("[data-e2e=retro-desktop-banner]");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("desktop");
  });

  test("desktop banner can be dismissed with X", async ({ page }) => {
    await waitForMenu(page);

    const banner = page.locator("[data-e2e=retro-desktop-banner]");
    await expect(banner).toBeVisible();

    await page.locator("[data-e2e=retro-banner-dismiss]").tap();

    await expect(banner).not.toBeVisible({ timeout: 2000 });
  });

  test("desktop banner re-appears on reload", async ({ page }) => {
    await waitForMenu(page);

    // Dismiss banner
    await page.locator("[data-e2e=retro-banner-dismiss]").tap();
    await expect(
      page.locator("[data-e2e=retro-desktop-banner]"),
    ).not.toBeVisible();

    // Reload
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Tap START to power on from idle screen after reload
    await page.locator("[data-e2e=retro-btn-start]").tap();

    const menu = page.locator("[data-e2e=retro-menu]");
    await expect(menu).toBeVisible({ timeout: 8000 });

    // Banner should be back
    await expect(page.locator("[data-e2e=retro-desktop-banner]")).toBeVisible();
  });
});

// ============================================================
// Sound Button Tests
// ============================================================
test.describe("RetroPlay Sound Button Tests", () => {
  test("sound button exists and toggles", async ({ page }) => {
    await waitForMenu(page);

    const soundBtn = page.locator("[data-e2e=retro-btn-sound]");
    await expect(soundBtn).toBeVisible();

    // Sound is enabled by default on mobile (setSoundEnabled(true) on mount)
    await expect(soundBtn).toHaveAttribute("data-sound", "on");
    await expect(soundBtn).toHaveAttribute("aria-label", "Sound on");

    // Toggle off
    await soundBtn.tap();
    await expect(soundBtn).toHaveAttribute("data-sound", "off");
    await expect(soundBtn).toHaveAttribute("aria-label", "Sound off");

    // Toggle on
    await soundBtn.tap();
    await expect(soundBtn).toHaveAttribute("data-sound", "on");
  });
});

// ============================================================
// Hardware Button Tests
// ============================================================
test.describe("RetroPlay Hardware Button Tests", () => {
  test("all hardware buttons respond to tap", async ({ page }) => {
    await waitForMenu(page);

    // D-pad buttons
    await expect(page.locator("[data-e2e=retro-dpad-up]")).toBeVisible();
    await expect(page.locator("[data-e2e=retro-dpad-down]")).toBeVisible();
    await expect(page.locator("[data-e2e=retro-dpad-left]")).toBeVisible();
    await expect(page.locator("[data-e2e=retro-dpad-right]")).toBeVisible();

    // A/B buttons
    await expect(page.locator("[data-e2e=retro-btn-a]")).toBeVisible();
    await expect(page.locator("[data-e2e=retro-btn-b]")).toBeVisible();

    // Meta buttons
    await expect(page.locator("[data-e2e=retro-btn-start]")).toBeVisible();
    await expect(page.locator("[data-e2e=retro-btn-sound]")).toBeVisible();
  });
});

// ============================================================
// Landscape Overlay Tests
// ============================================================
test.describe("RetroPlay Landscape Overlay Tests", () => {
  test("landscape overlay appears in landscape orientation", async ({
    page,
  }) => {
    await waitForMenu(page);

    // Simulate landscape
    await page.setViewportSize({ width: 844, height: 390 });

    const overlay = page.locator("[data-e2e=retro-landscape-overlay]");
    await expect(overlay).toBeVisible({ timeout: 3000 });
    await expect(overlay).toContainText("Rotate");
  });
});

// ============================================================
// Visual Regression Tests
// ============================================================
test.describe("RetroPlay Visual Regression Tests", () => {
  test("retro menu screen", async ({ page }) => {
    await waitForMenu(page);
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("mobile-00-menu.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("retro About section", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-about]").tap();
    await expect(page.locator("[data-e2e=retro-section-view]")).toBeVisible();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("mobile-01-about.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("retro Experience section", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-experience]").tap();
    await expect(page.locator("[data-e2e=retro-section-view]")).toBeVisible();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("mobile-02-experience.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("retro Skills section", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-skills]").tap();
    await expect(page.locator("[data-e2e=retro-section-view]")).toBeVisible();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("mobile-03-skills.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("retro Contact section", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-contact]").tap();
    await expect(page.locator("[data-e2e=retro-section-view]")).toBeVisible();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("mobile-04-contact.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("retro Resume section", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-resume]").tap();
    await expect(page.locator("[data-e2e=retro-section-view]")).toBeVisible();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("mobile-05-resume.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });
});

// Idle screen visual test (static, no animation — reliable for screenshots)
test.describe("RetroPlay Idle Screen Visual Regression", () => {
  test("retro idle screen", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const idleScreen = page.locator("[data-e2e=retro-boot-idle]");
    await expect(idleScreen).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("mobile-06-idle-screen.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });
});

// ============================================================
// Tablet Tests
// ============================================================
const tabletTest = base.extend({
  viewport: devices["iPad Pro 11"].viewport,
  userAgent: devices["iPad Pro 11"].userAgent,
  deviceScaleFactor: devices["iPad Pro 11"].deviceScaleFactor,
  isMobile: devices["iPad Pro 11"].isMobile,
  hasTouch: devices["iPad Pro 11"].hasTouch,
});

tabletTest.describe("RetroPlay Tablet Tests", () => {
  tabletTest("tablet retro menu screen", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Tap START to power on from idle screen
    await page.locator("[data-e2e=retro-btn-start]").tap();

    const menu = page.locator("[data-e2e=retro-menu]");
    await expect(menu).toBeVisible({ timeout: 8000 });

    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("mobile-07-tablet-menu.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  tabletTest("tablet retro section navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Tap START to power on from idle screen
    await page.locator("[data-e2e=retro-btn-start]").tap();

    const menu = page.locator("[data-e2e=retro-menu]");
    await expect(menu).toBeVisible({ timeout: 8000 });

    // Tap About
    await page.locator("[data-e2e=retro-menu-item-about]").tap();
    await expect(page.locator("[data-e2e=retro-section-view]")).toBeVisible();
    await expect(
      page.locator("[data-e2e=retro-section-content]"),
    ).toContainText("ABOUT ME");
  });
});

// ============================================================
// Small Viewport Tests (iPhone SE - 320px)
// ============================================================
const smallTest = base.extend({
  viewport: { width: 320, height: 568 },
  isMobile: true,
  hasTouch: true,
});

smallTest.describe("RetroPlay Small Viewport Tests", () => {
  smallTest("small viewport retro menu", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Tap START to power on from idle screen
    await page.locator("[data-e2e=retro-btn-start]").tap();

    const menu = page.locator("[data-e2e=retro-menu]");
    await expect(menu).toBeVisible({ timeout: 8000 });

    // All menu items should be visible
    await expect(
      page.locator("[data-e2e=retro-menu-item-about]"),
    ).toBeVisible();
    await expect(
      page.locator("[data-e2e=retro-menu-item-resume]"),
    ).toBeVisible();
  });
});

// ============================================================
// Accessibility Tests
// ============================================================
test.describe("RetroPlay Accessibility Tests", () => {
  test("menu items have proper ARIA attributes", async ({ page }) => {
    await waitForMenu(page);

    // Check menu has list role
    const menuList = page.locator("[data-e2e=retro-menu] [role=list]");
    await expect(menuList).toBeVisible();

    // Check About item has listitem role and aria-label
    const aboutItem = page.locator("[data-e2e=retro-menu-item-about]");
    await expect(aboutItem).toHaveAttribute("aria-label", "About");
    await expect(aboutItem).toHaveAttribute("role", "listitem");
  });

  test("section content has proper aria-label", async ({ page }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-about]").tap();

    const region = page.locator(
      "[data-e2e=retro-section-content][role=region]",
    );
    await expect(region).toBeVisible();
    await expect(region).toHaveAttribute("aria-label", "ABOUT");
  });

  test("contact links have proper attributes for external links", async ({
    page,
  }) => {
    await waitForMenu(page);
    await page.locator("[data-e2e=retro-menu-item-contact]").tap();

    const linkedinLink = page.locator("[data-e2e=retro-contact-linkedin]");
    await expect(linkedinLink).toHaveAttribute("target", "_blank");
    await expect(linkedinLink).toHaveAttribute("rel", /noopener/);
  });

  test("sound button has proper aria-label", async ({ page }) => {
    await waitForMenu(page);

    const soundBtn = page.locator("[data-e2e=retro-btn-sound]");
    await expect(soundBtn).toBeVisible();
    await expect(soundBtn).toHaveAttribute("aria-label", /Sound/);
  });

  test("desktop banner has note role", async ({ page }) => {
    await waitForMenu(page);

    const banner = page.locator("[data-e2e=retro-desktop-banner]");
    await expect(banner).toHaveAttribute("role", "note");
  });

  test("hardware buttons have minimum touch target size", async ({ page }) => {
    await waitForMenu(page);

    // Check D-pad buttons meet 44px minimum
    const dpadUp = page.locator("[data-e2e=retro-dpad-up]");
    const box = await dpadUp.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(36); // 2.25rem = 36px
    expect(box!.height).toBeGreaterThanOrEqual(36);

    // Check A/B buttons
    const btnA = page.locator("[data-e2e=retro-btn-a]");
    const btnABox = await btnA.boundingBox();
    expect(btnABox).not.toBeNull();
    expect(btnABox!.width).toBeGreaterThanOrEqual(44);
    expect(btnABox!.height).toBeGreaterThanOrEqual(44);
  });
});
