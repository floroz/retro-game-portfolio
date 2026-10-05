import { expect, test, type Locator, type Page } from "@playwright/test";
import { NATIVE_W } from "../src/engine/constants";
import { advanceScene } from "./clock";

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

    test("ticket, conversation, travel and every inspection fit the game window", async ({
      page,
    }) => {
      test.setTimeout(180000);
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
      await advanceScene(page, 1000);
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
      // Keyboard navigation must follow focus even while another row is hovered.
      await page.mouse.move(0, 0);
      await choices.first().focus();
      await choices.nth(2).hover();
      await page.keyboard.press("ArrowDown");
      await expect(choices.nth(1)).toBeFocused();
      await screenshot("four-choices");

      await page.keyboard.press("Escape");
      await advanceScene(page, 12000);
      await expect(page.locator("canvas[data-drawn=hall]")).toBeVisible();
      await expectInsideGame(page, page.locator("[data-e2e=toolbar-button]"));
      await screenshot("hall");

      const inspection = page.locator("[data-e2e=object-inspection]");
      const inspect = async (name: string, title: string) => {
        for (let elapsed = 0; elapsed < 15000; elapsed += 500) {
          await advanceScene(page, 500);
          if (await inspection.isVisible()) break;
        }
        await expect(inspection).toHaveAttribute("data-ready", "true");
        await expect(inspection.getByRole("heading", { level: 2 })).toHaveText(
          title,
        );
        await expect
          .poll(() =>
            inspection.getByRole("img").evaluate((element) => {
              const img = element as unknown as {
                complete: boolean;
                naturalWidth: number;
              };
              return img.complete && img.naturalWidth > 0;
            }),
          )
          .toBe(true);
        await expectInsideGame(
          page,
          inspection.getByRole("navigation").getByRole("button"),
        );
        await screenshot(`inspection-${name}`);
        // Long readings stay scrollable within the painted paper. Ensure the
        // final paragraph/link is reachable, including Resume and Contact links.
        const copy = inspection.getByLabel("Inspection text");
        await copy.evaluate((element) => {
          const pane = element as unknown as {
            scrollTop: number;
            scrollHeight: number;
          };
          pane.scrollTop = pane.scrollHeight;
        });
        await expect(copy.locator("p, a").last()).toBeInViewport({ ratio: 1 });
        await page.keyboard.press("Escape");
        await expect(inspection).toBeHidden();
      };
      const advanceToScene = async (id: string) => {
        const canvas = page.locator(`canvas[data-drawn=${id}]`);
        for (let elapsed = 0; elapsed < 30000; elapsed += 500) {
          await advanceScene(page, 500);
          if (await canvas.isVisible()) break;
        }
        await expect(canvas).toBeVisible();
        // Finish the entrance iris before using the destination's objects.
        await advanceScene(page, 1000);
      };
      for (const destination of [
        {
          scene: "london",
          object: "chalkboard",
          section: "skills",
          title: "Skills",
        },
        {
          scene: "zurich",
          object: "career-album",
          section: "experience",
          title: "Experience",
        },
        {
          scene: "sorrento",
          object: "fridge",
          section: "about",
          title: "About Daniele",
        },
      ]) {
        // Boarding passes open information immediately; gates perform travel.
        await page
          .locator(
            `[data-e2e=hotspot][data-hotspot="exit:gate-${destination.scene}"]`,
          )
          .first()
          .click();
        if (destination.scene === "london") {
          const map = page.locator("canvas[data-drawn=map]");
          for (let elapsed = 0; elapsed < 15000; elapsed += 100) {
            await advanceScene(page, 100);
            if (await map.isVisible()) break;
          }
          await expect(map).toBeVisible();
          await page.clock.runFor(300);
          await screenshot("travel-map");
          // The airfield and its label are too small to reliably trip the
          // whole-scene tolerance. Keep a focused baseline at both sizes.
          const mapBounds = await map.boundingBox();
          if (!mapBounds) throw new Error("Travel map has no visible bounds");
          const scale = mapBounds.width / NATIVE_W;
          const origin = { x: 110, y: 76 };
          await expect(page).toHaveScreenshot(
            `${viewport.name}-travel-origin.png`,
            {
              clip: {
                x: mapBounds.x + (origin.x - 35) * scale,
                y: mapBounds.y + (origin.y - 6) * scale,
                width: 70 * scale,
                height: 24 * scale,
              },
              animations: "disabled",
              maxDiffPixelRatio: 0.01,
            },
          );
        }
        await advanceToScene(destination.scene);
        await page
          .locator(
            `[data-e2e=hotspot][data-hotspot="object:${destination.object}"]`,
          )
          .first()
          .click();
        await inspect(destination.section, destination.title);
        await advanceScene(page, 3000);
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
        await advanceScene(page, 3000);
        await expectInsideGame(page, page.locator("[data-e2e=toolbar-button]"));
        await screenshot(destination.scene);
        await page
          .locator('[data-e2e=hotspot][data-hotspot="exit:door-hall"]')
          .first()
          .click();
        await advanceToScene("hall");
      }
      for (const section of ["contact", "resume"]) {
        await page
          .locator(`[data-e2e=toolbar-button][data-section=${section}]`)
          .click();
        await inspect(section, section === "contact" ? "Contact" : "Resume");
      }
    });
  });
}
