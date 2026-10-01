# Agent guide

This repository is Daniele Tortora's personal portfolio, presented as a 90s retro game. Read `README.md` for the visitor tour.

## What this project is

**Premise.** A portfolio disguised as a LucasArts point-and-click adventure (_Monkey Island_, _Day of the Tentacle_, _Grim Fandango_). On desktop it runs inside a working Windows 98 desktop. On mobile it becomes a Game Boy. A pixel-art Daniele acts as the guide, walking the visitor through About, Skills, Experience, Contact, and Resume.

**Audience.** Recruiters, hiring managers, and engineering peers. The site should catch a recruiter's eye, impress a hiring manager with its creativity, and show peers real craft. The quality of the build is part of the pitch.

**Principles.** Every change must preserve these:

- **Information stays reachable.** A visitor who won't play can still reach contact, resume, and experience within one or two clicks. The game sits on top of the content and never gates it. When immersion and access conflict, access wins.
- **Period authenticity.** Windows 98 chrome, SCUMM-style scenes, and the Game Boy should look and behave like the real thing, not a generic "retro" look. Leave out modern flourishes that break the illusion.
- **Humor and personality.** Copy uses the self-aware, playful LucasArts voice heard in the dialogue and the Recycle Bin, never corporate résumé-speak.

**Direction.** Version one is a single painted background with hotspots laid over it. The next version keeps the concept and deepens it. Each section becomes its own scene, built from separate assets and connected by exits, so the world feels more polished and immersive. The Windows 98 shell, the Game Boy mobile view, the character as guide, and the SCUMM verb toolbar all stay. Inventory, puzzles, and other deeper adventure mechanics are out of scope for now.

## Start here

Use the Node.js version in `.node-version` and the npm version in `package.json` with your preferred version manager:

```bash
npm ci
npm run dev
```

Vite prints the local URL, usually `http://localhost:5173`.

## Find the right code

| Concern                                     | Start with                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Desktop/mobile selection                    | `src/App.tsx`, `src/hooks/useIsMobile.ts`                                                       |
| Desktop windows and game scene              | `src/components/desktop/`, `src/components/game/`, `src/components/toolbar/`                    |
| Mobile console                              | `src/components/mobile/`                                                                        |
| Character movement, actions, dialogs, sound | `src/store/gameStore.ts`, `src/hooks/`                                                          |
| Title card, conversation choices            | `src/components/dialog/`, `src/components/toolbar/Dialogue.tsx`, `src/hooks/useConversation.ts` |
| Personal details and portfolio copy         | `src/config/profile.ts`                                                                         |
| Dialogue, terminal commands, scene hotspots | `src/config/dialogTrees.ts`, `src/config/commands.ts`, `src/config/scene.ts`                    |
| SEO and generated HTML                      | `src/config/profile.ts`, `scripts/generate-html.ts`, `scripts/generate-og-image.ts`             |
| Styling                                     | Component `*.module.scss` files and `src/styles/`                                               |
| Image loading, compression, size budgets    | `src/engine/preload.ts`, `src/engine/assets.ts`, `scripts/vite/optimize-images.ts`              |

`src/config/profile.ts` supplies shared personal information to desktop, mobile, terminal, and SEO views. Dialogue text lives in `src/config/dialogTrees.ts`. The game store starts fresh on each page load; it does not persist state.

## Make changes

- Follow the existing React, TypeScript, and SCSS module patterns near the code you change.
- Never use TypeScript `any` unless explicitly instructed. If its use is required, add a comment with a comprehensive justification.
- Keep personal information in the config files rather than duplicating it in components. When changing content, check every view that renders it.
- After modifying any file, run `npm run format` at the end of your edits. Review the resulting diff, since this command formats the whole repository.

For detailed content changes, see `.agents/skills/update-portfolio-content/SKILL.md`.

## Art and asset loading

The game loads every image before it needs one, like a real game, so no scene, title card or inspection paints in half-loaded. Two pieces make that work. The build ships small files, and the page loads them in the order the visitor meets them, behind the Windows 98 launch dialog.

### How it works

1. **Sources live in `src/assets/`** as PNG, WebP or JPEG. The repository keeps them full quality, and the asset scripts (`npm run assets:*`) and `npm run lint:assets` work on them. Don't compress them by hand.
2. **`vite build` re-encodes each image as WebP** (`scripts/vite/optimize-images.ts`):
   - Painted art goes lossy at q90.
   - Pixel art, meaning 256 colours or fewer, stays lossless so hard edges don't blur.
   - Transparency is always lossless, so the alpha boxes behind hotspots can't move.
   - A file under 4 KB, or one WebP can't shrink, ships as it is.
   - Encodes are cached in `node_modules/.vite/` by source and encoder settings, so only changed art is re-encoded.
   - The dev server serves the sources unchanged.
3. **`src/engine/preload.ts` loads the art in tiers.** Each tier starts once the one before it has finished, so art the visitor sees next never shares bandwidth with art they can't reach yet:
   1. the title card's boarding pass (high priority);
   2. Daniele and the first scene, `START_SCENE` (high priority);
   3. the other scenes and the travel map;
   4. the inspection and souvenir cards, warmed into the HTTP cache only.
4. **Each stage waits for its art, with a fallback.**
   - The launch dialog's bar (`Win95LoadingWidget.tsx`) follows tiers 1 and 2. It never finishes in under 1.5 s.
   - The title card's Start then waits for all scene art. It shows "HOLD ON" until then.
   - Both give up after 12 s, so a stalled download never locks anyone out of the content.
   - In a scene, the renderer holds its last frame until every image the scene draws has loaded.
   - `ImageStore` decodes each image before it counts as loaded, so a first frame never stalls on a decode.
5. **Size budgets keep it that way.** `src/engine/__tests__/assetBudget.test.ts` measures each preloaded image with the build's own encoder, through a `?shipped-size` import. Tiers 1 and 2 together must stay under 1 MB, and any single image under 512 KB.

### Gotchas

- **Plain `<img>` art must be listed by hand.** Canvas art listed in a scene config is preloaded automatically, as is any new scene in `SCENES`. That covers backgrounds, sprites, object states, animation strips, props and slots, and `preload.test.ts` fails if any is missing. Art drawn as a plain `<img>` is different: the boarding pass, the inspection cards, and any new title, overlay or card art go into `preload.ts` by hand. Nothing tests for that, and missing art only downloads when it first appears, painting in progressively.
- **Image size sets density.** The engine reads each image's density from its pixel size (`src/engine/density.ts`), so don't resize art to make a file smaller. For example, a background must stay 320×160 logical px: 1280×640 at density 4. Shrink bytes through the encoder, or by simplifying the art.
- **Remastered scene art mirrors the v1 path.** Scene configs import the v1 file under `src/assets/scenes/`, and `remasterArtwork` (`src/engine/artwork.ts`) swaps in the file at the same path under `src/assets/remaster/`. New canvas art therefore needs both files, with matching names; a remaster file without a v1 twin is never drawn. Plain `<img>` art, such as the title and inspection cards, imports its file under `remaster/` directly.
- **Transparent padding changes hotspots.** An object without an explicit hotspot gets one from its sprite's alpha bounding box.
- **Some images aren't optimised.** Anything in `public/`, images referenced from SCSS `url()`, and formats other than PNG, WebP and JPEG ship exactly as they are.
- **Dev doesn't show compression.** To judge the shipped look or byte sizes, run `npm run build` and `npm run preview`.
- **Fix art over budget; don't raise the limit.** Shrink, simplify or split the art. The launch budget is what the 1.5 s launch dialog can cover on an ordinary connection.
- **Compare canvas pixels with the shipped art.** An E2E check that compares the canvas with an image must use the art the build ships, not the PNG source. Lossy WebP moves colours by a few levels. Use `shippedArt` in `test/e2e-airport.test.ts`.
- **Changing encoder settings changes snapshots.** Editing the quality or palette rule in `optimize-images.ts` changes every lossy image, so the visual baselines need regenerating in Docker. The cache key includes those settings, so no manual cache clearing is needed.
- **Mobile doesn't use the tiers.** The desktop preload doesn't run on the Game Boy view, which imports no art from `src/assets/` today. If it starts to, it needs a preload of its own.

## Verify changes

| Check                                    | Command                   | When to use it                       |
| ---------------------------------------- | ------------------------- | ------------------------------------ |
| Lint, types, format, styles, unused code | `npm run lint`            | Code or style changes                |
| Production build                         | `npm run build`           | Code, config, or build changes       |
| Unit tests                               | `npm run test:unit`       | Store, hooks, or config behavior     |
| Component browser tests                  | `npm run test:browser`    | Browser-dependent component behavior |
| Playwright E2E                           | `npm run test:e2e:docker` | User flows or visual changes         |

E2E tests and screenshot updates must run in Docker so snapshots match the Linux CI environment. Use `npm run test:e2e:docker:update` only when an intended visual change requires new baselines, then inspect the changed `*-linux.png` images. Do not generate or commit macOS or Windows snapshots. See `.agents/skills/e2e-testing/SKILL.md` for targeted runs and troubleshooting.

Tests live beside source in `src/**/__tests__/`; Playwright flows and snapshots live in `test/`. The PR workflow in `.github/workflows/pr.yml` runs lint, build, unit tests, browser tests, and E2E tests.

## Debugging entry points

- Wrong content: check `src/config/profile.ts`, then the relevant renderer; check `src/config/dialogTrees.ts` for conversation text.
- A click or hotspot does nothing: trace `src/config/scene.ts` through `src/hooks/useSceneClick.ts` into `src/store/gameStore.ts`.
- Dialog or window state is wrong: inspect store actions and the desktop components that call them.
- Mobile and desktop differ: check `src/hooks/useIsMobile.ts` and the separate render paths in `src/App.tsx`.
- A screenshot fails: reproduce with the Docker E2E command, inspect the Playwright report and image diff, and update a baseline only if the visual change is intended.
