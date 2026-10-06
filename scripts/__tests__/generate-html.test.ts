import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { PROFILE } from "../../src/config/profile";
import { generateHTML } from "../generate-html";

const browserWindow = new Window();
const parser = new browserWindow.DOMParser();
const document = parser.parseFromString(generateHTML(), "text/html");
const meta = (key: string) =>
  document
    .querySelector(`meta[property="${key}"], meta[name="${key}"]`)
    ?.getAttribute("content");

describe("generated SEO", () => {
  it("uses the final canonical URL consistently", () => {
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    ).toBe(PROFILE.seo.siteUrl);
    expect(meta("og:url")).toBe(PROFILE.seo.siteUrl);
    expect(meta("twitter:url")).toBe(PROFILE.seo.siteUrl);
    expect(readFileSync("public/sitemap.xml", "utf8")).toContain(
      `<loc>${PROFILE.seo.siteUrl}</loc>`,
    );
    expect(readFileSync("public/robots.txt", "utf8")).toContain(
      `Sitemap: ${new URL("sitemap.xml", PROFILE.seo.siteUrl).href}`,
    );
    expect(readFileSync("public/robots.txt", "utf8")).not.toContain(
      "Disallow:",
    );
  });

  it("shares the title, description, accessible image and content hash", async () => {
    expect(meta("og:title")).toBe(document.title);
    expect(meta("twitter:title")).toBe(document.title);
    expect(meta("description")).toBe(PROFILE.seo.shortDescription);
    expect(meta("og:description")).toBe(meta("description"));
    expect(meta("twitter:description")).toBe(meta("description"));
    expect(meta("og:image:alt")).toBe(PROFILE.seo.ogImageAlt);
    expect(meta("twitter:image:alt")).toBe(PROFILE.seo.ogImageAlt);
    const bytes = readFileSync(`public/${PROFILE.seo.ogImage}`);
    const hash = createHash("md5").update(bytes).digest("hex").slice(0, 8);
    expect(meta("og:image")).toBe(
      `${new URL(PROFILE.seo.ogImage, PROFILE.seo.siteUrl).href}?v=${hash}`,
    );
    expect(meta("twitter:image")).toBe(meta("og:image"));
    const image = await sharp(bytes).metadata();
    expect(image.format).toBe("png");
    expect(meta("og:image:type")).toBe("image/png");
    expect(image.width).toBe(1200);
    expect(image.height).toBe(630);
    expect(image.width).toBe(Number(meta("og:image:width")));
    expect(image.height).toBe(Number(meta("og:image:height")));
  });

  it("keeps structured data and the non-JavaScript fallback tied to profile content", () => {
    const schemas = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    ).map(
      (script) =>
        JSON.parse(script.textContent ?? "") as Record<string, unknown>,
    );
    expect(schemas[0]).toMatchObject({
      "@type": "Person",
      name: PROFILE.name,
      description: PROFILE.experienceSummary,
      url: PROFILE.seo.siteUrl,
    });
    expect(schemas[0]).not.toHaveProperty("image");
    expect(schemas[1]).toMatchObject({
      "@type": "WebSite",
      description: PROFILE.seo.shortDescription,
      image: meta("og:image"),
    });
    // Parse noscript separately: browsers treat it as text when scripts are enabled.
    const fallback = parser.parseFromString(
      generateHTML().split("<noscript>")[1].split("</noscript>")[0],
      "text/html",
    );
    for (const skill of Object.values(PROFILE.skills).flat()) {
      expect(fallback.body.textContent).toContain(skill);
    }
    expect(
      fallback.querySelector(`a[href="${PROFILE.resumeUrl}"]`),
    ).not.toBeNull();
    expect(fallback.body.textContent).toContain(PROFILE.bio.split("\n\n")[1]);
  });
});
