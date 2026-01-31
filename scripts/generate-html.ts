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

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { PROFILE } from "../src/config/profile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Derived SEO values
const SEO = {
  title: `${PROFILE.name} | ${PROFILE.title}`,
  description: `Senior Software Engineer with 8+ years building production applications with React, TypeScript, Next.js, Vue, Node.js. Specializing in AI integration, design systems, and scalable architectures. Based in ${PROFILE.location}.`,
  topSkills:
    "React, Vue.js, TypeScript, Node.js, Go, Kubernetes, AWS, GCP, AI Integration, Design Systems",
};

function generateStructuredData() {
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: PROFILE.name,
    jobTitle: PROFILE.seo.currentRole,
    description: `${PROFILE.seo.currentRole} with 8+ years of experience specializing in React, TypeScript, Vue.js, Node.js, and AI integration. Currently at ${PROFILE.seo.currentCompany} building AI-powered security features.`,
    url: PROFILE.seo.siteUrl,
    email: PROFILE.email,
    image: `${PROFILE.seo.siteUrl}/og-image.png`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Zürich",
      addressRegion: "ZH",
      addressCountry: "CH",
    },
    sameAs: [
      PROFILE.social.github,
      PROFILE.social.linkedin,
      `https://twitter.com/${PROFILE.seo.twitter.replace("@", "")}`,
    ],
    knowsAbout: [
      ...PROFILE.skills.frontend.slice(0, 5),
      ...PROFILE.skills.backend.slice(0, 4),
      ...PROFILE.skills.cloud.slice(0, 3),
      "AI Integration",
      "Design Systems",
    ],
    alumniOf: {
      "@type": "EducationalOrganization",
      name: "Università degli Studi di Napoli Federico II",
    },
    worksFor: {
      "@type": "Organization",
      name: PROFILE.seo.currentCompany,
      url: "https://snyk.io",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: PROFILE.seo.siteName,
    url: PROFILE.seo.siteUrl,
    description: `Interactive portfolio of ${PROFILE.name}, ${PROFILE.seo.currentRole} specializing in React, TypeScript, and AI integration.`,
    author: {
      "@type": "Person",
      name: PROFILE.name,
    },
  };

  return { personSchema, websiteSchema };
}

function generateHTML(): string {
  const { personSchema, websiteSchema } = generateStructuredData();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Primary Meta Tags -->
    <title>${SEO.title}</title>
    <meta name="title" content="${SEO.title}" />
    <meta name="description" content="${SEO.description}" />
    <meta name="author" content="${PROFILE.name}" />
    <meta name="keywords" content="${PROFILE.seo.keywords.join(", ")}" />

    <!-- Canonical URL -->
    <link rel="canonical" href="${PROFILE.seo.siteUrl}" />

    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="theme-color" content="${PROFILE.seo.themeColor}" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${PROFILE.seo.siteUrl}" />
    <meta property="og:title" content="${PROFILE.name} | ${PROFILE.seo.currentRole}" />
    <meta property="og:description" content="${PROFILE.seo.shortDescription}" />
    <meta property="og:image" content="${PROFILE.seo.siteUrl}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${PROFILE.name} - ${PROFILE.seo.currentRole} Portfolio" />
    <meta property="og:site_name" content="${PROFILE.seo.siteName}" />
    <meta property="og:locale" content="en_US" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${PROFILE.seo.siteUrl}" />
    <meta name="twitter:title" content="${PROFILE.name} | ${PROFILE.seo.currentRole}" />
    <meta name="twitter:description" content="${PROFILE.seo.shortDescription}" />
    <meta name="twitter:image" content="${PROFILE.seo.siteUrl}/og-image.png" />
    <meta name="twitter:image:alt" content="${PROFILE.name} - ${PROFILE.seo.currentRole} Portfolio" />
    <meta name="twitter:site" content="${PROFILE.seo.twitter}" />
    <meta name="twitter:creator" content="${PROFILE.seo.twitter}" />

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
  .split("\n")
  .map((line) => "    " + line)
  .join("\n")}
    </script>

    <!-- Structured Data - WebSite Schema -->
    <script type="application/ld+json">
${JSON.stringify(websiteSchema, null, 2)
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
        <h1>${PROFILE.name} - ${PROFILE.seo.currentRole}</h1>
        <p>${PROFILE.seo.shortDescription}</p>
        <h2>About</h2>
        <p>${PROFILE.bio.split("\n")[0]}</p>
        <h2>Experience</h2>
        <ul>
${PROFILE.workExperience.map((job) => `          <li><strong>${job.company}</strong> - ${job.role} (${job.period})</li>`).join("\n")}
        </ul>
        <h2>Skills</h2>
        <p>${SEO.topSkills}</p>
        <h2>Contact</h2>
        <ul>
          <li>Email: <a href="mailto:${PROFILE.email}">${PROFILE.email}</a></li>
          <li>GitHub: <a href="${PROFILE.social.github}">github.com/floroz</a></li>
          <li>LinkedIn: <a href="${PROFILE.social.linkedin}">linkedin.com/in/danieletortora</a></li>
        </ul>
      </div>
    </noscript>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
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

main();
