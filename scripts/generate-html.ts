/**
 * Generate index.html with SEO meta tags from config
 *
 * This script reads from the PROFILE config and generates the index.html
 * with all meta tags baked in at build time.
 *
 * Usage:
 *   npm run generate:html
 *
 * This runs automatically before build via the prebuild script.
 */

import { writeFileSync, readFileSync } from "fs";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { PROFILE } from "../src/config/profile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Compute content hash of OG image for cache busting
function getOGImageHash(): string {
  const ogImagePath = join(__dirname, "..", "public", PROFILE.seo.ogImage);

  const imageBuffer = readFileSync(ogImagePath);
  const hash = createHash("md5").update(imageBuffer).digest("hex");
  return hash.substring(0, 8); // Use first 8 characters
}

// Profile copy can contain quotes, ampersands and angle brackets.
function escapeHTML(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Derived SEO values
const SEO = {
  title: `${PROFILE.name} | ${PROFILE.seo.currentRole}`,
  description: PROFILE.seo.shortDescription,
  topSkills: Object.values(PROFILE.skills).flat().join(", "),
};

function generateStructuredData() {
  const ogImageHash = getOGImageHash();
  const ogImageUrl = `${new URL(PROFILE.seo.ogImage, PROFILE.seo.siteUrl).href}?v=${ogImageHash}`;

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: PROFILE.name,
    jobTitle: PROFILE.seo.currentRole,
    description: PROFILE.experienceSummary,
    url: PROFILE.seo.siteUrl,
    email: PROFILE.email,
    address: PROFILE.location,
    sameAs: [
      PROFILE.social.github,
      PROFILE.social.linkedin,
      `https://twitter.com/${PROFILE.seo.twitter.replace("@", "")}`,
    ],
    knowsAbout: Object.values(PROFILE.skills).flat(),
    worksFor: {
      "@type": "Organization",
      name: PROFILE.seo.currentCompany,
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: PROFILE.seo.siteName,
    url: PROFILE.seo.siteUrl,
    description: PROFILE.seo.shortDescription,
    image: ogImageUrl,
    author: {
      "@type": "Person",
      name: PROFILE.name,
    },
  };

  return { personSchema, websiteSchema };
}

export function generateHTML(): string {
  const { personSchema, websiteSchema } = generateStructuredData();
  const ogImageHash = getOGImageHash();
  const ogImageUrl = `${new URL(PROFILE.seo.ogImage, PROFILE.seo.siteUrl).href}?v=${ogImageHash}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Primary Meta Tags -->
    <title>${escapeHTML(SEO.title)}</title>
    <meta name="title" content="${escapeHTML(SEO.title)}" />
    <meta name="description" content="${escapeHTML(SEO.description)}" />
    <meta name="author" content="${escapeHTML(PROFILE.name)}" />
    <meta name="keywords" content="${escapeHTML(PROFILE.seo.keywords.join(", "))}" />

    <!-- Canonical URL -->
    <link rel="canonical" href="${escapeHTML(PROFILE.seo.siteUrl)}" />

    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="theme-color" content="${escapeHTML(PROFILE.seo.themeColor)}" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHTML(PROFILE.seo.siteUrl)}" />
    <meta property="og:title" content="${escapeHTML(PROFILE.name)} | ${escapeHTML(PROFILE.seo.currentRole)}" />
    <meta property="og:description" content="${escapeHTML(PROFILE.seo.shortDescription)}" />
    <meta property="og:image" content="${escapeHTML(ogImageUrl)}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHTML(PROFILE.seo.ogImageAlt)}" />
    <meta property="og:site_name" content="${escapeHTML(PROFILE.seo.siteName)}" />
    <meta property="og:locale" content="en_US" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${escapeHTML(PROFILE.seo.siteUrl)}" />
    <meta name="twitter:title" content="${escapeHTML(PROFILE.name)} | ${escapeHTML(PROFILE.seo.currentRole)}" />
    <meta name="twitter:description" content="${escapeHTML(PROFILE.seo.shortDescription)}" />
    <meta name="twitter:image" content="${escapeHTML(ogImageUrl)}" />
    <meta name="twitter:image:alt" content="${escapeHTML(PROFILE.seo.ogImageAlt)}" />
    <meta name="twitter:site" content="${escapeHTML(PROFILE.seo.twitter)}" />
    <meta name="twitter:creator" content="${escapeHTML(PROFILE.seo.twitter)}" />

    <!-- Additional SEO Meta Tags -->
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="googlebot" content="index, follow" />
    <meta name="google" content="notranslate" />
    <meta name="format-detection" content="telephone=no" />

    <!-- Geo Tags -->
    <meta name="geo.region" content="CH-ZH" />
    <meta name="geo.placename" content="Zürich" />
    <meta name="geo.position" content="47.3769;8.5417" />
    <meta name="ICBM" content="47.3769, 8.5417" />

    <!-- Structured Data - Person Schema -->
    <script type="application/ld+json">
${JSON.stringify(personSchema, null, 2)
  .replaceAll("<", "\\u003c")
  .split("\n")
  .map((line) => "    " + line)
  .join("\n")}
    </script>

    <!-- Structured Data - WebSite Schema -->
    <script type="application/ld+json">
${JSON.stringify(websiteSchema, null, 2)
  .replaceAll("<", "\\u003c")
  .split("\n")
  .map((line) => "    " + line)
  .join("\n")}
    </script>

    <!-- Preconnect to external domains for performance -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  </head>
  <body>
    <!-- Noscript fallback for SEO crawlers -->
    <noscript>
      <div style="padding: 20px; font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto;">
        <h1>${escapeHTML(PROFILE.name)} - ${escapeHTML(PROFILE.seo.currentRole)}</h1>
        <p>${escapeHTML(PROFILE.seo.shortDescription)}</p>
        <h2>About</h2>
        <p>${PROFILE.bio.split("\n\n").slice(0, 4).map(escapeHTML).join("</p><p>")}</p>
        <h2>Experience</h2>
        <ul>
${PROFILE.workExperience.map((job) => `          <li><strong>${escapeHTML(job.company)}</strong> - ${escapeHTML(job.role)} (${escapeHTML(job.period)})</li>`).join("\n")}
        </ul>
        <h2>Resume</h2>
        <p><a href="${escapeHTML(PROFILE.resumeUrl)}">Download ${escapeHTML(PROFILE.name)}’s resume</a></p>
        <h2>Skills</h2>
        <p>${escapeHTML(SEO.topSkills)}</p>
        <h2>Contact</h2>
        <ul>
          <li>Email: <a href="mailto:${escapeHTML(PROFILE.email)}">${escapeHTML(PROFILE.email)}</a></li>
          <li>GitHub: <a href="${escapeHTML(PROFILE.social.github)}">${escapeHTML(new URL(PROFILE.social.github).host + new URL(PROFILE.social.github).pathname)}</a></li>
          <li>LinkedIn: <a href="${escapeHTML(PROFILE.social.linkedin)}">${escapeHTML(new URL(PROFILE.social.linkedin).host + new URL(PROFILE.social.linkedin).pathname)}</a></li>
        </ul>
      </div>
    </noscript>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "e972d1f56247451bb0722174416c1ca7"}'></script><!-- End Cloudflare Web Analytics -->
  </body>
</html>
`;
}

function main() {
  console.log("📄 Generating index.html from PROFILE config...\n");

  const html = generateHTML();
  const outputPath = join(__dirname, "..", "index.html");

  writeFileSync(outputPath, html, "utf-8");

  console.log("✅ index.html generated successfully!\n");
  console.log(`   Title: ${SEO.title}`);
  console.log(`   URL: ${PROFILE.seo.siteUrl}`);
  console.log(`   Author: ${PROFILE.name}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main();
}
