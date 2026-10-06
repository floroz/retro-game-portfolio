import { expect, type Page } from "@playwright/test";

export async function enterKitchen(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();
  await page.getByRole("link", { name: "Enter Pocket Adventure" }).tap();
  await expect(page.locator("[data-e2e=pocket-motion]")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.evaluate("document.fonts.ready");
}

export function sectionLink(page: Page, label: string) {
  return page
    .getByRole("navigation", { name: "Portfolio" })
    .getByRole("link", { name: label, exact: true });
}
