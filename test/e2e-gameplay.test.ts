import { test, expect, type Page } from "@playwright/test";
import {
  waitForGameWindowReady,
  dismissWelcomeAndWaitForDialog,
  advanceUntilVisible,
  arriveInScene,
  openAirport,
  startAdventure,
} from "./adventure";
import { advanceScene } from "./clock";
import { PROFILE } from "../src/config/profile";
import { DIALOG_TREE } from "../src/config/dialogTrees";

interface AudioWindow {
  AudioContext: new () => { readonly state: string };
  portfolioAudioContexts: { readonly state: string }[];
}

test.use({
  viewport: { width: 1280, height: 720 },
});

test.describe("Desktop gameplay smoke", { tag: "@smoke" }, () => {
  test.use({ viewport: { width: 1440, height: 1000 } });
  test.setTimeout(60000);

  for (const destination of [
    { scene: "london", object: "chalkboard", title: "Skills" },
    { scene: "zurich", object: "career-album", title: "Experience" },
    {
      scene: "sorrento",
      object: "fridge",
      title: `About ${PROFILE.name.split(" ")[0]}`,
    },
  ]) {
    test(`gate, object and return journey: ${destination.scene}`, async ({
      page,
    }) => {
      await openAirport(page);
      await page
        .locator(
          `[data-e2e=hotspot][data-hotspot="exit:gate-${destination.scene}"]`,
        )
        .first()
        .click();
      await arriveInScene(page, destination.scene);

      const object = page
        .locator(
          `[data-e2e=hotspot][data-hotspot="object:${destination.object}"]`,
        )
        .first();
      await object.click();
      const inspection = page.locator("[data-e2e=object-inspection]");
      await advanceUntilVisible(page, inspection);
      await expect(inspection).toHaveAttribute("data-ready", "true");
      await expect(inspection.getByRole("heading", { level: 2 })).toHaveText(
        destination.title,
      );
      await expect(
        inspection.locator("[data-e2e=inspection-page] p").nth(1),
      ).not.toBeEmpty();
      await inspection
        .getByRole("button", { name: "Back to the scene", exact: true })
        .click();
      await expect(inspection).toBeHidden();
      await expect(page.locator("canvas[data-drawn]")).toHaveAttribute(
        "data-drawn",
        destination.scene,
      );

      await page
        .locator('[data-e2e=hotspot][data-hotspot="exit:door-hall"]')
        .first()
        .click();
      await arriveInScene(page, "hall");
      await expect(
        page
          .locator('[data-e2e=hotspot][data-hotspot="exit:gate-london"]')
          .first(),
      ).toBeEnabled();
      await page.getByRole("button", { name: /^Contact, in / }).click();
      await expect(
        page.getByRole("dialog", { name: "Contact", exact: true }),
      ).toBeVisible();
    });
  }

  test("dialogue choices progress and dismiss back to the trunk", async ({
    page,
  }) => {
    await startAdventure(page);
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Continue...", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Continue...", exact: true })
      .click();
    await advanceScene(page, 100);
    await page.keyboard.press("Enter");
    const choice = page.getByRole("button", {
      name: "Tell me about yourself",
      exact: true,
    });
    await expect(choice).toBeVisible();
    await choice.focus();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("button", {
        name: "What kind of work do you do?",
        exact: true,
      }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-e2e=dialogue-line]")).toContainText(
      DIALOG_TREE["work-intro"].text,
    );
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-e2e=adventure-dialog]")).toBeHidden();
    await page.getByRole("button", { name: /^Resume, in / }).click();
    await expect(
      page.getByRole("dialog", { name: "Resume", exact: true }),
    ).toBeVisible();
  });

  test("essential content opens in one click and returns to the airport", async ({
    page,
  }) => {
    await openAirport(page);
    for (const section of ["Experience", "Contact", "Resume"]) {
      const opener = page.getByRole("button", {
        name: new RegExp(`^${section}, in `),
      });
      await opener.click();
      const inspection = page.getByRole("dialog", {
        name: section,
        exact: true,
      });
      await expect(inspection).toHaveAttribute("data-ready", "true");
      await expect(inspection.getByRole("heading", { level: 2 })).toHaveText(
        section,
      );
      if (section === "Contact")
        await expect(
          inspection.getByRole("link", { name: PROFILE.email, exact: true }),
        ).toHaveAttribute("href", `mailto:${PROFILE.email}`);
      if (section === "Resume")
        await expect(
          inspection.getByRole("link", {
            name: "Read or download my resume (PDF)",
            exact: true,
          }),
        ).toHaveAttribute("href", PROFILE.resumeUrl);
      await page.keyboard.press("Escape");
      await expect(inspection).toBeHidden();
      await expect(opener).toBeFocused();
      await expect(page.locator("canvas[data-drawn]")).toHaveAttribute(
        "data-drawn",
        "hall",
      );
    }
  });
});

test(
  "all portfolio sections remain one click away in every room",
  { tag: "@reachability" },
  async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openAirport(page);
    for (const scene of ["hall", "sorrento", "london", "zurich"]) {
      if (scene !== "hall") {
        await page
          .locator(`[data-e2e=hotspot][data-hotspot="exit:gate-${scene}"]`)
          .first()
          .click();
        await arriveInScene(page, scene);
        await page.keyboard.press("Escape");
      }
      for (const section of [
        "About",
        "Skills",
        "Experience",
        "Contact",
        "Resume",
      ]) {
        const opener = page.getByRole("button", {
          name: new RegExp(`^${section}, in `),
        });
        await opener.click();
        const inspection = page.locator("[data-e2e=object-inspection]");
        await expect(inspection).toHaveAttribute("data-ready", "true");
        await expect(inspection.getByRole("heading", { level: 2 })).toHaveText(
          section === "About" ? `About ${PROFILE.name.split(" ")[0]}` : section,
        );
        if (section === "Contact") {
          await expect(
            inspection.getByRole("link", { name: PROFILE.email, exact: true }),
          ).toHaveAttribute("href", `mailto:${PROFILE.email}`);
          await expect(
            inspection.getByRole("link", { name: "GitHub", exact: true }),
          ).toHaveAttribute("href", PROFILE.social.github);
          await expect(
            inspection.getByRole("link", { name: "LinkedIn", exact: true }),
          ).toHaveAttribute("href", PROFILE.social.linkedin);
        }
        if (section === "Resume") {
          await expect(
            inspection.getByRole("link", {
              name: "Read or download my resume (PDF)",
              exact: true,
            }),
          ).toHaveAttribute("href", PROFILE.resumeUrl);
        }
        await page.keyboard.press("Escape");
        await expect(inspection).toBeHidden();
        await expect(opener).toBeFocused();
        await expect(page.locator("canvas[data-drawn]")).toHaveAttribute(
          "data-drawn",
          scene,
        );
      }
      if (scene !== "hall") {
        await page
          .locator('[data-e2e=hotspot][data-hotspot="exit:door-hall"]')
          .first()
          .click();
        await arriveInScene(page, "hall");
        await page.keyboard.press("Escape");
      }
    }
  },
);

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
  test("desktop stays silent until Start, then plays and can be muted", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const audioWindow = globalThis as unknown as AudioWindow;
      const contexts: { readonly state: string }[] = [];
      audioWindow.portfolioAudioContexts = contexts;
      const OriginalContext = audioWindow.AudioContext;
      audioWindow.AudioContext = class extends OriginalContext {
        constructor() {
          super();
          contexts.push(this);
        }
      };
    });
    const audioRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/audio/")) audioRequests.push(request.url());
    });
    await page.goto("/");
    await waitForGameWindowReady(page);
    const welcome = page.locator("[data-e2e=welcome-screen]");
    await expect(welcome.getByText("Starts with sound")).toBeVisible();
    expect(audioRequests).toEqual([]);
    const contextState = () =>
      page.evaluate(
        () =>
          (globalThis as unknown as AudioWindow).portfolioAudioContexts[0]
            ?.state,
      );
    expect(await contextState()).toBeUndefined();
    await welcome
      .getByRole("button", { name: "Press space or click to start" })
      .click();
    await expect(welcome).toBeHidden();
    await expect
      .poll(() => audioRequests.some((url) => url.includes("/audio/music/")))
      .toBe(true);
    await expect.poll(contextState).toBe("running");
    await page.getByRole("button", { name: "Mute sound", exact: true }).click();
    await expect.poll(contextState).toBe("suspended");
    await page
      .getByRole("button", { name: "Enable sound", exact: true })
      .click();
    await expect.poll(contextState).toBe("running");
  });

  test("muting the boarding pass keeps a keyboard start silent", async ({
    page,
  }) => {
    const audioRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/audio/")) audioRequests.push(request.url());
    });
    await page.goto("/");
    await waitForGameWindowReady(page);
    const welcome = page.locator("[data-e2e=welcome-screen]");
    await welcome.getByRole("button", { name: "Sound", exact: true }).click();
    await expect(welcome.getByText("Starts silently")).toBeVisible();
    await dismissWelcomeAndWaitForDialog(page);
    expect(audioRequests).toEqual([]);
    await expect(
      page.getByRole("button", { name: "Enable sound", exact: true }),
    ).toBeVisible();
  });

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
  const firstToolbarButton = page.locator("[data-e2e=toolbar-button]").first();
  await firstToolbarButton.focus();

  // Verify focus is on the first toolbar button
  await expect(firstToolbarButton).toBeFocused();

  // Tab to next toolbar button
  await page.keyboard.press("Tab");
  const secondToolbarButton = page.locator("[data-e2e=toolbar-button]").nth(1);
  await expect(secondToolbarButton).toBeFocused();

  // Navigate through a few more buttons to verify tab navigation works
  await page.keyboard.press("Tab");
  const thirdToolbarButton = page.locator("[data-e2e=toolbar-button]").nth(2);
  await expect(thirdToolbarButton).toBeFocused();
});
