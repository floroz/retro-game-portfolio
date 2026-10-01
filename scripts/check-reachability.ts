/**
 * Two-click reachability: from every scene, each of About, Skills, Experience,
 * Contact, and Resume is reached in two clicks or fewer, and GitHub and
 * LinkedIn open.
 *
 * Usage:
 *   npm run check:reachability
 *
 * It builds the site and serves it (serve-build.ts), then for each scene
 * loads a fresh page, gets Daniele into that scene, and for each section:
 *
 * - "auto": clicks the section's toolbar button once and waits for the
 *   content screen to open by itself when the trip ends (Daniele walks to
 *   the exit and flies; the trip's length is reported);
 * - "skip": clicks the button, then clicks the scene once during the trip,
 *   which skips straight to the content.
 *
 * A section passes when its content screen opens after one click (auto) and
 * after two (skip). GitHub and LinkedIn pass when one click opens a new tab
 * on the profile's URL. Prints a markdown table; exits 1 on any failure.
 */

import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { PROFILE } from "../src/config/profile.js";
import { SECTIONS } from "../src/config/sections.js";
import type { SceneId, SectionId } from "../src/engine/types.js";
import { serveBuild } from "./serve-build.js";

const SCENES: SceneId[] = ["hall", "london", "zurich", "sorrento"];
const SECTION_IDS = Object.keys(SECTIONS) as SectionId[];
const TRIP_TIMEOUT = 45000;

/** A fresh page, the title card dismissed and the intro conversation closed. */
async function startGame(context: BrowserContext, url: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForSelector("[data-e2e=welcome-screen]", { timeout: 30000 });
  await page.keyboard.press("Space");
  const dialog = page.locator("[data-e2e=adventure-dialog]");
  await dialog.waitFor({ state: "visible", timeout: 30000 });
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 10000 });
  await page.waitForSelector('canvas[data-drawn="hall"]');
  return page;
}

const button = (page: Page, section: SectionId) =>
  page.locator(`[data-e2e=toolbar-button][data-section=${section}]`);

const content = (page: Page, section: SectionId) =>
  page.locator(`[data-e2e=terminal-screen][data-action=${section}]`);

/** Gets Daniele into `scene` (a section of its country, then back out). */
async function goTo(page: Page, scene: SceneId) {
  if (scene === "hall") return;
  const section = SECTION_IDS.find((s) => SECTIONS[s].home === scene);
  if (!section) throw new Error(`No section lives in ${scene}`);
  await button(page, section).click();
  await content(page, section).waitFor({ timeout: TRIP_TIMEOUT });
  await page.keyboard.press("Escape");
  await content(page, section).waitFor({ state: "hidden" });
  await page.waitForSelector(`canvas[data-drawn="${scene}"]`);
}

interface Result {
  scene: SceneId;
  what: string;
  ok: boolean;
  detail: string;
  /** For the table. */
  cell: string;
}

async function checkSection(
  context: BrowserContext,
  url: string,
  scene: SceneId,
  section: SectionId,
  skip: boolean,
): Promise<{ ok: boolean; clicks: number; seconds: number; error?: string }> {
  let page: Page | undefined;
  try {
    page = await startGame(context, url);
    await goTo(page, scene);
    const start = Date.now();
    await button(page, section).click();
    let clicks = 1;
    // When the section lives in this very scene, Daniele only walks to its
    // object and the content opens within a moment: nothing to skip.
    if (skip) await page.waitForTimeout(600);
    if (skip && !(await content(page, section).isVisible())) {
      // During the trip, a click on the scene skips to the content.
      const box = await page.locator("canvas[data-drawn]").boundingBox();
      if (!box) throw new Error("The scene isn't on screen");
      await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
      clicks = 2;
    }
    await content(page, section).waitFor({
      timeout: skip ? 5000 : TRIP_TIMEOUT,
    });
    return { ok: true, clicks, seconds: (Date.now() - start) / 1000 };
  } catch (error) {
    return {
      ok: false,
      clicks: skip ? 2 : 1,
      seconds: 0,
      error: String(error).split("\n")[0],
    };
  } finally {
    await page?.close();
  }
}

async function checkLink(
  context: BrowserContext,
  url: string,
  scene: SceneId,
  control: "github" | "linkedin",
): Promise<Result> {
  const expected = PROFILE.social[control];
  let page: Page | undefined;
  try {
    page = await startGame(context, url);
    await goTo(page, scene);
    const popup = page.waitForEvent("popup", { timeout: 10000 });
    await page.locator(`[data-control=${control}]`).click();
    const opened = await popup;
    const actual = opened.url();
    await opened.close();
    const ok = actual.startsWith(expected);
    return {
      scene,
      what: control,
      ok,
      cell: ok ? "1 click" : "FAIL",
      detail: ok ? "1 click, new tab" : `opened ${actual}`,
    };
  } catch (error) {
    return {
      scene,
      what: control,
      ok: false,
      cell: "FAIL",
      detail: String(error).split("\n")[0],
    };
  } finally {
    await page?.close();
  }
}

async function run() {
  const site = await serveBuild();
  const browser = await chromium.launch();
  const results: Result[] = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
    });
    // Nothing leaves the machine: the profile links load as empty pages.
    await context.route(
      (u) => u.hostname !== "127.0.0.1",
      (route) =>
        route.fulfill({ status: 200, contentType: "text/html", body: "" }),
    );

    // One scene at a time, its checks side by side.
    for (const scene of SCENES) {
      const jobs: Promise<Result>[] = [];
      for (const section of SECTION_IDS) {
        jobs.push(
          (async () => {
            const auto = await checkSection(
              context,
              site.url,
              scene,
              section,
              false,
            );
            const skip = await checkSection(
              context,
              site.url,
              scene,
              section,
              true,
            );
            const ok = auto.ok && skip.ok;
            return {
              scene,
              what: section,
              ok,
              cell: ok ? `1 click (${auto.seconds.toFixed(1)} s)` : "FAIL",
              detail: ok
                ? `1 click, opens by itself after ${auto.seconds.toFixed(1)} s; 2 clicks skips the trip (${skip.seconds.toFixed(1)} s)`
                : `auto: ${auto.error ?? "ok"}; skip: ${skip.error ?? "ok"}`,
            };
          })(),
        );
      }
      jobs.push(checkLink(context, site.url, scene, "github"));
      jobs.push(checkLink(context, site.url, scene, "linkedin"));
      results.push(...(await Promise.all(jobs)));
    }
  } finally {
    await browser.close();
    await site.close();
  }

  const rows = [
    "about",
    "skills",
    "experience",
    "contact",
    "resume",
    "github",
    "linkedin",
  ];
  console.log("\n| From | " + rows.join(" | ") + " |");
  console.log("| --- | " + rows.map(() => "---").join(" | ") + " |");
  for (const scene of SCENES) {
    const cells = rows.map((what) => {
      const r = results.find((x) => x.scene === scene && x.what === what);
      return r?.cell ?? "FAIL";
    });
    console.log(`| ${scene} | ${cells.join(" | ")} |`);
  }
  console.log("");
  for (const r of results) {
    console.log(
      `${r.ok ? "ok  " : "FAIL"} ${r.scene} > ${r.what}: ${r.detail}`,
    );
  }
  if (results.some((r) => !r.ok)) process.exit(1);
}

run().catch((error) => {
  console.error("Reachability check failed:", error);
  process.exit(1);
});
