import { test, expect, type Page } from "@playwright/test";
import { PROFILE } from "../src/config/profile";

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

async function expectTextInsideArtwork(page: Page, section = "") {
  const inspection = page.locator("[data-e2e=object-inspection]");
  const art = await inspection.locator("img").boundingBox();
  const copy = await inspection.getByLabel("Inspection text").boundingBox();
  expect(art).not.toBeNull();
  expect(copy).not.toBeNull();
  if (!art || !copy) return;
  // Small windows deliberately put reading below the illustration. On the
  // full card every page must stay on the blank right-hand surface.
  if (copy.y >= art.y + art.height - 1) return;
  expect(copy.x).toBeGreaterThan(
    art.x + art.width * (section === "resume" ? 0.43 : 0.45),
  );
  expect(copy.x + copy.width).toBeLessThan(art.x + art.width * 0.95);
  expect(copy.y).toBeGreaterThan(art.y + art.height * 0.1);
  expect(copy.y + copy.height).toBeLessThan(art.y + art.height * 0.86);
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
        await expectTextInsideArtwork(page, section);
        await expect(
          page.locator("[data-e2e=object-inspection] img"),
        ).toHaveJSProperty("naturalWidth", 1280);
        await expect(
          page.locator("[data-e2e=object-inspection] img"),
        ).toHaveJSProperty("naturalHeight", 640);
        const links: string[] = [];
        const skillPages: string[] = [];
        if (section === "skills") {
          await expect(page.getByLabel("Inspection text")).toHaveCSS(
            "color",
            "rgb(244, 236, 216)",
          );
        }
        for (let index = 0; index < 100; index++) {
          await expectTextFits(page);
          if (section === "skills")
            skillPages.push(
              (await page
                .locator("[data-e2e=inspection-page]")
                .textContent()) ?? "",
            );
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
        if (section === "skills") {
          const text = skillPages.join(" ");
          for (const label of Object.values(PROFILE.skillGroupLabels))
            expect(text).toContain(label);
          for (const skill of Object.values(PROFILE.skills).flat())
            expect(text).toContain(skill);
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
