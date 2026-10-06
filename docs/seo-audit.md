# SEO and social preview audit

Audited on 6 October 2026 against the repository and live HTTP responses.
Professional details were checked against `src/config/profile.ts`; this audit
does not independently verify employment history or ownership of social accounts.

## Findings applied

| Finding                                                        | Evidence                                                                               | Change                                                                                                                                           |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Social preview shows the airport                               | OG generator stopped after the Hall intro                                              | Capture the real Sorrento kitchen after travelling through its gate; retain the Windows 98 frame and travel trunk                                |
| Canonical points to a redirect                                 | `https://www.danieletortora.com/` responds with 301 to `https://danieletortora.com/`   | Use the final URL in canonical, OG, Twitter, JSON-LD, sitemap, robots and production configuration                                               |
| Crawlers cannot fetch application code                         | Live robots.txt blocks `/assets/*.js` and `/assets/*.css`                              | Allow rendering resources, as required for JavaScript indexing                                                                                   |
| Sitemap date has gone stale                                    | `lastmod` remained `2026-01-31` after the revamp                                       | Omit the optional date until it can accurately track significant content changes                                                                 |
| OG image is cached as immutable for a year                     | Live `/og-image.png` response; its dedicated Netlify rule targeted `/daniele-og-*.png` | Match the current file and require revalidation; retain content-hash URLs in social metadata                                                     |
| Search title is long and differs from social titles            | Generated title included multiple role suffixes                                        | Use the same concise name and role across search and social previews                                                                             |
| Description does not describe the current portfolio experience | Generic technology list in profile SEO                                                 | Mention Zürich, engineering experience and the point-and-click adventure                                                                         |
| Image alt text does not describe the picture                   | Generic name/role text                                                                 | Add the Sorrento kitchen, bay, toolbar and Windows 98 window to both social alt fields                                                           |
| Structured data treats a game screenshot as a person portrait  | `Person.image` pointed at the OG screenshot                                            | Associate it with `WebSite.image` instead                                                                                                        |
| Structured data duplicates facts outside config                | Hardcoded description, city, skill subset, university and employer URL                 | Derive description, location and skills from profile; omit university absent from visible profile content and unnecessary hardcoded employer URL |
| Non-JavaScript fallback omits useful content                   | Only first bio line, hand-written skills subset, no resume link                        | Include professional bio paragraphs, every configured skill and a direct resume link                                                             |
| Profile copy is interpolated unescaped                         | HTML attributes and text inserted directly                                             | Escape HTML values and `<` inside JSON-LD scripts                                                                                                |
| Missing OG file only warns during build                        | Generator returned the `no-image` hash                                                 | Fail generation if the referenced image is missing                                                                                               |
| Browser capture helper can serve stale metadata                | It regenerated HTML only if index.html was absent                                      | Regenerate HTML before every temporary build                                                                                                     |

The OG screenshot is a committed 1200×630 PNG, approximately 193 KiB. Its
content hash changes automatically in generated HTML after a new capture.
No scene artwork, game layout or screenshot baselines were changed.

## Verified resources and existing coverage

- The canonical homepage returns HTTP 200.
- The current OG asset returns HTTP 200 with `image/png`.
- The configured resume returns HTTP 200 with `application/pdf`; its existing
  Netlify URL remains valid.
- Search/social metadata and JSON-LD are generated into the initial HTML,
  rather than being added only after JavaScript executes.
- Both social networks use the same image URL, dimensions and descriptive alt
  text. Social cache refresh is still controlled by each platform after deployment.
- Robots, sitemap, manifest, favicon and touch icons are present. The manifest
  name and description still match the portfolio.
- Regression tests cover canonical consistency, crawl permissions, metadata,
  image hash/format/dimensions, structured data and fallback content.

## Further improvements

1. **Provide crawlable portfolio content before interaction.** The expanded
   `noscript` fallback helps visitors and clients without JavaScript. Google
   renders JavaScript, and the desktop entry screen still requires interaction
   before career sections appear. Prerendering a visible semantic portfolio
   overview or introducing dedicated content URLs would make that information
   reliably available to rendering crawlers. This needs a product/layout decision
   to preserve the adventure and Windows 98 shell; it is beyond this metadata update.
2. **Review deployment fallback status codes.** Netlify rewrites every unknown
   path to the homepage with HTTP 200. If real content routes are introduced,
   add an actual not-found response rather than creating soft 404 pages.
3. **Validate after deployment.** Check the deployed image cache headers and
   social previews, then inspect the canonical homepage in Google Search Console.
   Search Console coverage and social crawler caches cannot be verified from
   repository tests. Check the configured Twitter handle if it has changed.
4. **Automate `lastmod` only from meaningful content changes.** Do not use every
   build's date; until a reliable source exists, leaving it out is accurate.

## References

- [Google: JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google: sitemap creation and accurate lastmod values](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Open Graph: image metadata and alt text](https://ogp.me/)
