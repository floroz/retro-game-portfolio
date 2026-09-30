import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 1100 },
  { width: 1024, height: 900 },
]) {
  test.describe(`Airport remaster at ${viewport.width}px`, () => {
    test.use({ viewport });
    test("both treatments retain the same walking geometry and readable dialogue", async ({
      page,
    }) => {
      // Two density-4 scenes are drawn per animation step in the comparison.
      test.setTimeout(90000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      // Analytics is unrelated to this local art review and rejects localhost in WebKit.
      await page.route("https://static.cloudflareinsights.com/**", (route) =>
        route.fulfill({ contentType: "application/javascript", body: "" }),
      );
      await page.clock.install();
      await page.goto("/?remaster=hall");
      const canvases = page.locator("[data-e2e=remaster-study] canvas");
      await expect(canvases).toHaveCount(2);
      await expect(canvases.nth(1)).toHaveAttribute("data-ready", "true", {
        timeout: 30000,
      });
      await page.clock.pauseAt(new Date(Date.now() + 1000));
      const stage = page.locator("[data-e2e=remaster-study]");
      const screenshot = async (name: string) => {
        const clip = await stage.boundingBox();
        if (!clip) throw new Error("Study not visible");
        await expect(page).toHaveScreenshot(`${viewport.width}-${name}.png`, {
          clip,
          maxDiffPixelRatio: 0.005,
          timeout: 30000,
        });
      };
      for (const [label, name] of [
        ["Current V2", "current"],
        ["Remaster study", "remaster"],
      ] as const) {
        await page.getByRole("button", { name: label, exact: true }).click();
        await screenshot(name);
      }
      await page.getByRole("button", { name: "Dialogue", exact: true }).click();
      await page.clock.runFor(50);
      await screenshot("dialogue");
      await page
        .getByRole("button", { name: "Walk to gates", exact: true })
        .click();
      await page.clock.runFor(4000);
      await page
        .getByRole("button", { name: "Pause motion", exact: true })
        .click();
      expect(await canvases.nth(0).getAttribute("data-position")).toBe(
        await canvases.nth(1).getAttribute("data-position"),
      );
      expect(await canvases.nth(0).getAttribute("data-position")).toContain(
        '"y":96',
      );
      await page.getByRole("button", { name: "Compare", exact: true }).click();
      const divider = page.getByRole("slider", { name: "Comparison divider" });
      await divider.focus();
      await divider.press("End");
      await expect(divider).toHaveValue("100");
      await divider.press("Home");
      await expect(divider).toHaveValue("0");
      expect(errors).toEqual([]);
    });
  });
}
