# Encoded images

How the game's images are stored, compressed, loaded and tested.

**Read this before you:**

- add, replace, resize or delete an image under `src/assets/`;
- add a new `<img>`, scene, sprite, animation or inspection card;
- change `scripts/vite/optimize-images.ts`, `src/engine/preload.ts`, `src/engine/assets.ts` or `Win95LoadingWidget.tsx`;
- write a test that compares canvas pixels or image sizes;
- debug art that loads late, looks blurry or shifted, or fails a size budget.

**Skip it** for copy, dialogue, styling or logic work that doesn't touch images.

How art is _made_ lives with its sources: generation prompts in `assets-src/prompts/`, one provenance record per asset in `assets-src/provenance/` (checked by `npm run lint:assets`), and the remaster recipes in `scripts/assets/remaster-*.ts` with their manifests in `assets-src/remaster/`. This file covers what happens to art after it is committed.

## The rule

Commit full-quality sources and let the build compress them. The game loads every image before it needs one, like a real game, so nothing paints in half-loaded.

Keep only the current artwork and the source images needed to reproduce it.
When replacing artwork, remove superseded exports, source images, concept sheets
and generation-only references from the working tree; Git preserves their
history. Update imports, preparation scripts and provenance records together.
Record historical references in provenance notes rather than keeping obsolete
image files just to satisfy a reference path. Current visual-test baselines and
images used by documentation serve separate purposes and remain where needed.

## Task checklists

**Add or replace canvas art**, meaning a scene background, sprite, object state, animation strip, prop or slot:

1. Add the v1 file under `src/assets/scenes/<scene>/` and its remastered twin at the same path under `src/assets/remaster/<scene>/`.
2. Keep the pixel size the engine expects. Density is read from pixel size; see [Gotchas](#gotchas).
3. Import the v1 path in the scene config (`src/config/scenes/<scene>.ts`). Preloading needs nothing else.
4. Run `npm run test:unit`. This runs `preload.test.ts` and `assetBudget.test.ts`.

**Add plain `<img>` art**, meaning a title card, overlay or inspection card:

1. Import the file under `src/assets/remaster/` directly.
2. Add it to a tier in `preloadTiers()` in `src/engine/preload.ts`. No test catches a missing entry.
3. Use a tier with `canvas: false` unless the canvas draws it.
4. Run `npm run test:unit`.

**Change the encoder** (quality, palette rule, formats):

1. Edit `scripts/vite/optimize-images.ts`. The cache key includes the settings, so there's no cache to clear.
2. Run `npm run test:unit` and `npm run build`.
3. Regenerate the visual baselines in Docker (`npm run test:e2e:docker:update`) and inspect them, because every lossy image changes.

**Write a test that reads canvas pixels:** compare with `shippedArt(path)` in `test/e2e-airport.test.ts`, never the PNG source.

## Files

| File                                             | Role                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `src/assets/`                                    | Full-quality sources. `scenes/` is v1; `remaster/` is the art the game draws.  |
| `scripts/vite/optimize-images.ts`                | Build plugin: WebP encode, disk cache, `?shipped-size` import.                 |
| `src/engine/artwork.ts`                          | `remasterArtwork`: swaps each v1 scene file for its `remaster/` twin.          |
| `src/engine/density.ts`                          | Works out each image's density from its pixel size.                            |
| `src/engine/assets.ts`                           | `ImageStore`: fetch priority, decode, alpha bounding boxes, `ready`/`settled`. |
| `src/engine/preload.ts`                          | Load order (tiers), `startPreload`, the launch dialog's progress.              |
| `src/components/desktop/Win95LoadingWidget.tsx`  | Launch dialog: waits for tiers 1 and 2.                                        |
| `src/components/dialog/WelcomeScreen.tsx`        | Title card: holds Start until all scene art is in.                             |
| `src/engine/__tests__/preload.test.ts`           | Every canvas image is in the load order, once, in the right tier.              |
| `src/engine/__tests__/assetBudget.test.ts`       | Size budgets, measured with the build's encoder.                               |
| `scripts/vite/__tests__/optimize-images.test.ts` | Encoder: palette detection, exact alpha, fallback to the original.             |

## Build: compression

`vite build` re-encodes every PNG, WebP and JPEG under `src/assets/` as WebP:

| Image                               | Encoding                  | Why                                    |
| ----------------------------------- | ------------------------- | -------------------------------------- |
| More than 256 colours (painted art) | Lossy q90, lossless alpha | ~10× smaller; no visible difference    |
| 256 colours or fewer (pixel art)    | Lossless                  | Lossy would blur hard edges            |
| Under 4 KB, or WebP isn't smaller   | Original bytes, unchanged | Nothing to save                        |
| Encoded WebP under 4 KB             | Inlined as a data URL     | Same as Vite's own `assetsInlineLimit` |

- **Alpha is always lossless,** so the bounding boxes the engine derives hotspots from never move.
- **Encodes are cached** in `node_modules/.vite/**/optimize-images/`, keyed by source bytes and encoder settings. A cold build takes about 18 s, a warm one about 3 s.
- **The dev server serves the sources unchanged.**
- **`?raw` and other query imports** are left alone.

## Runtime: load order and gates

`startPreload()` runs once, on desktop, as soon as the app mounts. Each tier starts once the one before it has finished, so art the visitor sees next never shares bandwidth with art they can't reach yet:

| Tier | Contents                                                 | Priority | Stored in                         |
| ---- | -------------------------------------------------------- | -------- | --------------------------------- |
| 1    | Title card boarding pass                                 | high     | `ImageStore`                      |
| 2    | Daniele (sheet and rig), the first scene (`START_SCENE`) | high     | `ImageStore`                      |
| 3    | Every other scene, the travel map                        | low      | `ImageStore`                      |
| 4    | Portfolio inspection cards                               | low      | HTTP cache only (`canvas: false`) |

Each stage waits for its art, with a fallback:

| Stage          | Waits for                                   | Limit                                   |
| -------------- | ------------------------------------------- | --------------------------------------- |
| Launch dialog  | Tiers 1–2 (the bar shows real progress)     | At least 1.5 s; opens anyway after 12 s |
| Title card     | Daniele, every scene, travel map; "HOLD ON" | Starts anyway after 12 s                |
| Scene renderer | Every image the current scene draws         | Holds its last frame until then         |

`ImageStore.load` sets `fetchPriority` and waits for `img.decode()`, so a first frame never stalls on decoding. A failed image counts as loaded, so a missing file never freezes the game.

## Budgets

`assetBudget.test.ts` imports each preloaded image with `?shipped-size`, which the plugin answers with the bytes the build would ship. The numbers match `dist/` without running a build.

| Budget                     | Limit  | Today                   | Reason                                              |
| -------------------------- | ------ | ----------------------- | --------------------------------------------------- |
| Tiers 1–2 (launch art)     | 1 MB   | ~0.75 MB                | What the 1.5 s launch dialog covers at about 5 Mbps |
| Any single preloaded image | 512 KB | ~394 KB (boarding pass) | Keeps one file from dominating a tier               |

When a budget fails, shrink, simplify or split the art. Don't raise the limit.

## Gotchas

- **Plain `<img>` art isn't preloaded automatically.** Only canvas art from scene configs is collected; anything else must be listed in `preload.ts` by hand. A missing entry downloads when it first appears and paints in progressively, and no test catches it.
- **Pixel size sets density.** The engine reads density (1, 2 or 4) from pixel size. A background must be 320×160 logical px: 1280×640 is density 4. A sprite follows its scene background's density, and shared sprites follow `SHARED_LOGICAL_SIZES`. Resizing art to save bytes breaks scenes; save bytes through the encoder or simpler art.
- **A remaster file with no v1 twin is never drawn.** `remasterArtwork` maps v1 paths only, so a canvas file under `remaster/` must mirror a v1 file of the same name under `scenes/`.
- **Transparent padding moves hotspots.** An object without an explicit hotspot gets one from its sprite's alpha bounding box.
- **Some images aren't compressed.** Anything in `public/`, images referenced from SCSS `url()`, and formats other than PNG, WebP and JPEG ship as they are.
- **Dev doesn't show the shipped art.** To judge the shipped look or byte sizes, run `npm run build && npm run preview`.
- **Exact-pixel tests against PNG sources fail.** Lossy WebP moves colours by 2–3 levels. Compare with `shippedArt(path)`.
- **Encoder changes touch every screenshot.** Any setting change re-encodes all lossy art, so the visual baselines must be regenerated in Docker.
- **Image URLs differ between dev and build.** Dev and tests use `/src/assets/...`. A build uses a hashed `assets/*.webp` file or a `data:` URL. Compare imported URLs with each other, never with literal paths.
- **Mobile uses its own preload.** `src/components/mobile/pocketAssets.ts` loads the approved portrait scene from `src/assets/mobile/`, decodes all animation sources before starting, then warms the inspection artwork. It does not start desktop preloading. Its budget test limits each image to 512 KB, welcome art to 1 MB, and the complete scene to 3 MB. A failed scene load offers a retry and never blocks the portfolio navigation.

## Verify

| What                        | Command                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| Load order and budgets      | `npm run test:unit`                                                  |
| Shipped files and sizes     | `npm run build`, then `ls -l dist/assets/*.webp`                     |
| Shipped look, request order | `npm run build && npm run preview`, then the browser's Network panel |
| Visual baselines            | `npm run test:e2e:docker` (update with `:update` only when intended) |
