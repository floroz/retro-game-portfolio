import { test, expect, type Page } from "@playwright/test";

async function openAirport(page: Page) {
  await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
  await page.goto("/");
  await expect(page.locator("[data-e2e=welcome-screen]")).toBeVisible({
    timeout: 30000,
  });
  await page.waitForLoadState("networkidle");
  await page.clock.pauseAt(new Date("2030-01-01T00:01:00Z"));
  await page.keyboard.press("Space");
  await page.clock.runFor(1000);
  await expect(page.locator("[data-e2e=adventure-dialog]")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.clock.runFor(12000);
}

async function ready(page: Page) {
  const inspection = page.locator("[data-e2e=object-inspection]");
  await expect(inspection).toHaveAttribute("data-ready", "true");
  await expect
    .poll(() =>
      inspection.locator("img").evaluate((element) => {
        const img = element as unknown as {
          complete: boolean;
          naturalWidth: number;
        };
        return img.complete && img.naturalWidth > 0;
      }),
    )
    .toBe(true);
}

async function expectTextFits(page: Page) {
  const dimensions = await page
    .getByLabel("Inspection text", { exact: true })
    .evaluate((element) => {
      const box = element as unknown as {
        clientWidth: number;
        clientHeight: number;
        scrollWidth: number;
        scrollHeight: number;
      };
      return {
        width: box.clientWidth,
        height: box.clientHeight,
        contentWidth: box.scrollWidth,
        contentHeight: box.scrollHeight,
      };
    });
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width + 1);
  expect(dimensions.contentHeight).toBeLessThanOrEqual(dimensions.height + 1);
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 900, height: 640 },
]) {
  test.describe(`inspections at ${viewport.width}px`, () => {
    test.use({ viewport });
    test("every portfolio page fits, preserving the room and actionable links", async ({
      page,
    }) => {
      test.setTimeout(90000);
      await openAirport(page);
      for (const section of [
        "skills",
        "about",
        "experience",
        "contact",
        "resume",
      ]) {
        const opener = page.locator(
          `[data-e2e=toolbar-button][data-section=${section}]`,
        );
        await opener.click();
        await ready(page);
        const links: string[] = [];
        for (let index = 0; index < 100; index++) {
          await expectTextFits(page);
          links.push(
            ...(await page
              .locator("[data-e2e=inspection-page] a")
              .evaluateAll((elements) =>
                elements.map((element) => element.getAttribute("href") ?? ""),
              )),
          );
          const next = page.getByRole("button", {
            name: "Next page",
            exact: true,
          });
          if (!(await next.count()) || (await next.isDisabled())) break;
          await next.click();
          if (index === 99)
            throw new Error("Pagination did not reach the final page");
        }
        if (section === "contact")
          expect(links.some((href) => href.startsWith("mailto:"))).toBe(true);
        if (section === "resume")
          expect(links.some((href) => href.endsWith(".pdf"))).toBe(true);
        await page.keyboard.press("Escape");
        await expect(opener).toBeFocused();
        await expect(page.locator("[data-e2e=scene]")).toHaveAttribute(
          "data-scene",
          "hall",
        );
      }
    });
  });
}

for (const [name, title] of [
  ["Sorrento limoncello", "Limoncello"],
  ["Swiss Army knife", "Swiss Army knife"],
  ["Swiss cheese wheel", "Swiss cheese"],
  ["London telephone-box miniature", "London calling"],
]) {
  test(`souvenir close-up: ${title}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openAirport(page);
    await page
      .getByRole("button", { name: `Inspect ${name}`, exact: true })
      .click();
    await page.clock.runFor(12000);
    await ready(page);
    await expect(
      page.getByRole("dialog", { name: title, exact: true }),
    ).toBeVisible();
    await expectTextFits(page);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-e2e=object-inspection]")).toHaveCount(0);
    await expect(page.locator("canvas[data-drawn=hall]")).toBeVisible();
  });
}
