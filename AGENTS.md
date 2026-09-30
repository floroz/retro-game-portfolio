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

`src/config/profile.ts` supplies shared personal information to desktop, mobile, terminal, and SEO views. Dialogue text lives in `src/config/dialogTrees.ts`. The game store starts fresh on each page load; it does not persist state.

## Make changes

- Follow the existing React, TypeScript, and SCSS module patterns near the code you change.
- Never use TypeScript `any` unless explicitly instructed. If its use is required, add a comment with a comprehensive justification.
- Keep personal information in the config files rather than duplicating it in components. When changing content, check every view that renders it.
- After modifying any file, run `npm run format` at the end of your edits. Review the resulting diff, since this command formats the whole repository.

For detailed content changes, see `.agents/skills/update-portfolio-content/SKILL.md`.

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
