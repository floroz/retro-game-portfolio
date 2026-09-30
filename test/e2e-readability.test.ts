import { expect, test, type Locator, type Page } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "compact", width: 1024, height: 768 },
] as const;

/** Visible hit targets must remain inside the game at its displayed size. */
async function expectInsideGame(page: Page, controls: Locator) {
  const game = await page.locator("[data-e2e=win95-game-window]").boundingBox();
  expect(game).not.toBeNull();
  if (!game) throw new Error("Game window has no visible bounds");

  for (const control of await controls.all()) {
    await expect(control).toBeInViewport();
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    if (!box) throw new Error("Control has no visible bounds");
    expect(box.x).toBeGreaterThanOrEqual(game.x - 1);
    expect(box.y).toBeGreaterThanOrEqual(game.y - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(game.x + game.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(game.y + game.height + 1);
  }
}

for (const viewport of viewports) {
  test.describe(`Readability at ${viewport.name} size`, () => {
    test.use({ viewport });

    test("ticket, conversation and all four scenes fit the game window", async ({
      page,
    }) => {
      test.setTimeout(120000);
      // A frozen clock keeps breathing sprites and scene effects at the same
      // frame. Advance through travel normally: no store or engine shortcuts.
      await page.clock.install();
      await page.goto("/");
      await expect(page.locator("[data-e2e=welcome-screen]")).toBeVisible({
        timeout: 30000,
      });
      await page.evaluate(
        () =>
          (
            globalThis as unknown as {
              document: { fonts: { ready: Promise<unknown> } };
            }
          ).document.fonts.ready,
      );
      await expect
        .poll(() =>
          page
            .locator("[data-e2e=welcome-screen-artwork]")
            .evaluate((element) => {
              const artwork = element as unknown as {
                complete: boolean;
                naturalWidth: number;
              };
              return artwork.complete && artwork.naturalWidth > 0;
            }),
        )
        .toBe(true);
      await page.clock.pauseAt(new Date(Date.now() + 1000));
      const game = page.locator("[data-e2e=win95-game-window]");
      const screenshot = async (name: string) => {
        await page.mouse.move(0, 0);
        const bounds = await game.boundingBox();
        if (!bounds) throw new Error("Game has no visible bounds");
        // Capture the known bounds directly: locator screenshots wait for
        // scrolling animation frames, which the deterministic clock pauses.
        await expect(page).toHaveScreenshot(`${viewport.name}-${name}.png`, {
          clip: bounds,
          animations: "disabled",
          maxDiffPixelRatio: 0.01,
          timeout: 30000,
        });
      };

      await screenshot("ticket");
      await page.keyboard.press("Space");
      await page.clock.runFor(1000);
      await expect(page.locator("[data-e2e=adventure-dialog]")).toBeVisible();
      await page.keyboard.press("Enter");
      await page.clock.runFor(100);
      await page
        .getByRole("button", { name: "Continue...", exact: true })
        .click();
      await page.clock.runFor(100);
      await page.keyboard.press("Enter");
      await page.clock.runFor(100);
      const choices = page.locator("[data-e2e=dialog-option]");
      await expect(choices).toHaveCount(4);
      await expectInsideGame(page, choices);
      // Exercise keyboard highlighting as well as all four visible rows.
      await page.mouse.move(0, 0);
      await choices.first().focus();
      await page.keyboard.press("ArrowDown");
      await expect(choices.nth(1)).toBeFocused();
      await screenshot("four-choices");

      await page.keyboard.press("Escape");
      await page.clock.runFor(12000);
      await expect(page.locator("canvas[data-drawn=hall]")).toBeVisible();
      await expectInsideGame(page, page.locator("[data-e2e=toolbar-button]"));
      await screenshot("hall");

      for (const destination of [
        { scene: "london", section: "skills" },
        { scene: "zurich", section: "experience" },
        { scene: "sorrento", section: "about" },
      ]) {
        await page
          .locator(
            `[data-e2e=toolbar-button][data-section=${destination.section}]`,
          )
          .click();
        await page.clock.runFor(12000);
        await expect(
          page.locator("[data-e2e=terminal-screen-content]"),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await page.clock.runFor(12000);
        await expect(
          page.locator(`canvas[data-drawn=${destination.scene}]`),
        ).toBeVisible();
        // Move away from the object just opened so Daniele does not cover
        // its label while reviewing the scene's signposting.
        const scene = page.locator("[data-e2e=scene]");
        const bounds = await scene.boundingBox();
        if (!bounds) throw new Error("Scene has no visible bounds");
        await scene.click({
          position: { x: bounds.width * 0.64, y: bounds.height * 0.9 },
        });
        await page.clock.runFor(3000);
        await expectInsideGame(page, page.locator("[data-e2e=toolbar-button]"));
        await screenshot(destination.scene);
      }
    });
  });
}
