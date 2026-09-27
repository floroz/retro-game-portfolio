# Agent guide

This repository is a React and TypeScript portfolio presented as a retro game. Desktop visitors use a Windows 95 style point-and-click scene; mobile visitors use a Game Boy style console. Read `README.md` for the visitor experience.

## Start here

Use the Node.js version in `.node-version` and the npm version in `package.json` with your preferred version manager:

```bash
npm ci
npm run dev
```

Vite prints the local URL, usually `http://localhost:5173`.

## Find the right code

| Concern                                     | Start with                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| Desktop/mobile selection                    | `src/App.tsx`, `src/hooks/useIsMobile.ts`                                           |
| Desktop windows and game scene              | `src/components/desktop/`, `src/components/game/`, `src/components/toolbar/`        |
| Mobile console                              | `src/components/mobile/`                                                            |
| Character movement, actions, dialogs, sound | `src/store/gameStore.ts`, `src/hooks/`                                              |
| Personal details and portfolio copy         | `src/config/profile.ts`                                                             |
| Dialogue, terminal commands, scene hotspots | `src/config/dialogTrees.ts`, `src/config/commands.ts`, `src/config/scene.ts`        |
| SEO and generated HTML                      | `src/config/profile.ts`, `scripts/generate-html.ts`, `scripts/generate-og-image.ts` |
| Styling                                     | Component `*.module.scss` files and `src/styles/`                                   |

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
