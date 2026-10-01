# Agent guide

This repository is Daniele Tortora's personal portfolio, presented as a 90s retro game. Read `README.md` for the visitor tour.

## What this project is

**Premise.** A portfolio disguised as a LucasArts point-and-click adventure (_Monkey Island_, _Day of the Tentacle_, _Grim Fandango_). On desktop it runs inside a working Windows 98 desktop. On mobile it becomes a portrait Pocket Adventure. A painted Daniele acts as the guide, walking the visitor through About, Skills, Experience, Contact, and Resume.

**Audience.** Recruiters, hiring managers, and engineering peers. The site should catch a recruiter's eye, impress a hiring manager with its creativity, and show peers real craft. The quality of the build is part of the pitch.

**Principles.** Every change must preserve these:

- **Information stays reachable.** A visitor who won't play can still reach contact, resume, and experience within one or two clicks. The game sits on top of the content and never gates it. When immersion and access conflict, access wins.
- **Period authenticity.** Windows 98 chrome, SCUMM-style scenes, and the Pocket Adventure should look and behave like the real thing, not a generic "retro" look. Leave out modern flourishes that break the illusion.
- **Humor and personality.** Copy uses the self-aware, playful LucasArts voice heard in the dialogue and the Recycle Bin, never corporate résumé-speak.

**Direction.** Version 2.1 is live. An airport hall leads to three rooms, one per country Daniele has lived in: Sorrento (About, Contact), London (Skills) and Zürich (Experience, Resume). Each room is built from separate painted layers and connected by gates and a travel map. Portfolio content opens in illustrated close-ups whose text comes from config. The travel-trunk toolbar opens any section in one click. The Windows 98 shell, the portrait Pocket Adventure, the character as guide and the trunk toolbar all stay. Pocket Adventure has one location, Sorrento; more mobile locations are a possible next step. Inventory, puzzles and other deeper adventure mechanics are out of scope for now. `docs/blog/v2-revamp.md` tells the history of the revamp. Treat it as history, not as a spec.

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
| Mobile adventure                            | `src/components/mobile/`, `src/config/pocketAdventure.ts`                                       |
| Scene engine: rendering, walking, character | `src/engine/` (`SceneEngine.ts`, `render.ts`, `rig/`)                                           |
| App state, close-ups, dialogs, sound        | `src/store/gameStore.ts`, `src/hooks/`                                                          |
| Title card, conversation choices            | `src/components/dialog/`, `src/components/toolbar/Dialogue.tsx`, `src/hooks/useConversation.ts` |
| Personal details and portfolio copy         | `src/config/profile.ts`                                                                         |
| Dialogue and scene hotspots                 | `src/config/dialogTrees.ts`, `src/config/scenes/`, `src/config/inspections.ts`                  |
| SEO and generated HTML                      | `src/config/profile.ts`, `scripts/generate-html.ts`, `scripts/generate-og-image.ts`             |
| Styling                                     | Component `*.module.scss` files and `src/styles/`                                               |
| Image loading, compression, size budgets    | `docs/encoded-images.md`, `src/engine/preload.ts`, `scripts/vite/optimize-images.ts`            |

`src/config/profile.ts` supplies shared personal information to desktop, mobile, and SEO views. Dialogue text lives in `src/config/dialogTrees.ts`. The game store starts fresh on each page load; it does not persist state.

## Make changes

- Follow the existing React, TypeScript, and SCSS module patterns near the code you change.
- Never use TypeScript `any` unless explicitly instructed. If its use is required, add a comment with a comprehensive justification.
- Keep personal information in the config files rather than duplicating it in components. When changing content, check every view that renders it.
- After modifying any file, run `npm run format` at the end of your edits. Review the resulting diff, since this command formats the whole repository.

For detailed content changes, see `.agents/skills/update-portfolio-content/SKILL.md`.

## Art and images

Before adding, replacing, resizing or loading an image, or editing the image pipeline, read [`docs/encoded-images.md`](docs/encoded-images.md). The short version: commit full-quality sources under `src/assets/`. The build compresses them, and the game preloads them in tiers behind the launch dialog.

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
- A click or hotspot does nothing: trace the object in `src/config/scenes/` through `src/components/game/Scene.tsx` and `SceneEngine.activate` in `src/engine/SceneEngine.ts`, then the host callbacks in `src/engine/runtime.ts`, into `src/store/gameStore.ts`. Under `npm run dev`, `?debug=scene` draws hotspots and walkboxes.
- Dialog or window state is wrong: inspect store actions and the desktop components that call them.
- Mobile and desktop differ: check `src/hooks/useIsMobile.ts` and the separate render paths in `src/App.tsx`.
- A screenshot fails: reproduce with the Docker E2E command, inspect the Playwright report and image diff, and update a baseline only if the visual change is intended.
