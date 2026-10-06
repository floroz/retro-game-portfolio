# Testing strategy research

Reviewed on 6 October 2026. Chromium runs the full suite; Firefox and WebKit run selected functional smoke journeys on every PR. CI scheduling has not changed.

## First step implemented: functional gameplay specs

Screenshot-free functional checks now live in [desktop gameplay](../test/e2e-gameplay.test.ts) and [mobile gameplay](../test/e2e-mobile-gameplay.test.ts). The existing functional checks were moved from the visual spec files, and desktop gate/object/return journeys, dialogue progression and essential content access now have independent outcome assertions. Shared helpers perform actual keyboard, pointer and touch interactions; the desktop clock still drives the production frame loop rather than changing engine or store state directly.

Ten journeys are tagged `@smoke`: five desktop checks (three country round trips, dialogue and essential content access) and five mobile checks (content shortcuts, object taps, profile links, browser history and dialogue). Select just these journeys with `npm run test:e2e:docker -- --grep @smoke`, or run both gameplay specs by passing their paths to the Docker command. No smoke journey compares screenshots.

Visual checks retain their original spec paths, screenshot names and PNG baselines. Mixed visual tours remain in the full Chromium suite. Mobile Chromium project matching includes both mobile files, and desktop Chromium excludes both. Reducing visual coverage and changing CI build/concurrency behavior remain later steps.

## Second step implemented: cross-browser functional smoke

Firefox and desktop WebKit now select only `e2e-gameplay.test.ts` and tests tagged `@smoke` (five journeys per engine). Mobile WebKit selects only `e2e-mobile-gameplay.test.ts` and the same tag (five mobile journeys). Both file matching and tag filtering are configured per project, so a normal full run includes compatibility checks without duplicating the visual suite. The tablet project remains disabled.

The resulting matrix contains 88 test executions: 73 existing Chromium desktop/mobile checks and 15 additional compatibility checks. `npm run test:e2e:docker -- --grep @smoke` selects 25 executions across all five enabled projects. To run only the new engines, use `npm run test:e2e:docker -- --project=firefox --project=webkit --project=mobile-safari`.

Secondary projects capture screenshots only on failure and inherit the first-retry trace policy. These are temporary diagnostic/report artifacts, not committed pixel-comparison baselines. No Firefox or WebKit PNG baseline is needed. Real-device Safari checks are still useful for platform-specific touch, scrolling and audio behavior.

### Initial compatibility timing

The first Docker run of the new projects used one worker and no retries. All 15 journeys passed on their first attempt, with no skipped or flaky cases. Summed test durations were:

| Project         | Journeys | Test time |
| --------------- | -------- | --------- |
| Firefox desktop | 5        | 21.6 s    |
| WebKit desktop  | 5        | 44.3 s    |
| WebKit mobile   | 5        | 6.4 s     |

The combined test time was 72.3 s. Playwright reported 98.5 s for the isolated run including web-server startup/build, excluding the Docker wrapper's dependency installation. These are local Docker measurements, not a CI runtime guarantee; they provide an initial cost estimate for adding compatibility coverage without multiplying visual baselines.

## What the repository currently tests

The following records the source audit before extraction, not a measured coverage percentage. At that point there were eight Playwright spec files. Desktop Chromium and mobile Chromium were enabled; Vitest component browser tests also used Chromium. The 66 tracked PNG baselines occupied 32.18 MiB, excluding Git history. The readability tour accounted for 26 images and 14.98 MiB; the remaster comparison accounted for six images and 3.42 MiB.

| Area                 | Evidence already present                                                                                                                                                                                                                                                                                                      | Practical limit                                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop adventure    | [Readability journeys](../test/e2e-readability.test.ts) enter London, Zürich and Sorrento through gates, open a primary object in each, dismiss its close-up, walk and return to the airport at two viewport sizes                                                                                                            | Two long tests combine functional checks with many snapshots; they are costly to reuse across browsers                                                                      |
| Content access       | [Inspection journeys](../test/e2e-inspections.test.ts) open all five sections, traverse pages, check text fit and links, preserve the airport and restore focus                                                                                                                                                               | They start in the airport; the one-click content guarantee could also be asserted from every country                                                                        |
| Walking and ambience | [Airport](../test/e2e-airport.test.ts) checks floor clicking, gate access, passengers, reduced motion and the Zürich exit; [pub](../test/e2e-pub.test.ts) checks depth, jukebox, Skills and return to the airport                                                                                                             | Several interactions use forced clicks, reducing evidence that a visitor can reach the control normally                                                                     |
| Conversations        | [Readability journeys](../test/e2e-readability.test.ts) cover intro progression and arrow focus; [component tests](../src/components/toolbar/__tests__/Dialogue.browser.test.tsx) cover numbers, Enter, Escape and choice transitions; [tree tests](../src/config/__tests__/dialogTrees.test.ts) validate branch reachability | Branch correctness has strong lower-level coverage; a complete non-intro conversation through the assembled desktop UI would add integration confidence                     |
| Desktop shell        | [Desktop journeys](../test/e2e-desktop.test.ts) cover Start shortcuts, minimize/maximize/restore, Show Desktop, launch cancellation and restart                                                                                                                                                                               | Game continuity after closing and reopening in a country, and after dragging/resizing, could be checked directly                                                            |
| Pocket Adventure     | [Mobile journeys](../test/e2e-mobile.test.ts) cover all five object links, shortcuts, work-history scrolling, Back/Forward, focus, small targets, landscape, dialogue, reduced motion, art failure/retry and sound requests                                                                                                   | All run in emulated mobile Chromium; the direct-link test also manually changes the hash after entry, so it is not a complete guarantee of automatic deep-link preservation |
| Engine behavior      | [Engine tests](../src/engine/__tests__/SceneEngine.test.ts) cover walkboxes, section activation, travel/skip, keyboard movement, conversations and sounds; store and component tests cover state/focus/pagination                                                                                                             | These do not prove browser events, React hooks, engine and rendering work together in other engines                                                                         |

### Highest-value additions

1. A screenshot-free desktop round trip: launch, use a real gate, skip the map by clicking, activate a primary object, read and dismiss content, return to the airport. Assert the destination and the next usable control at each step.
2. Real keyboard walking, key release, focus loss and another desktop window taking focus. The engine has movement tests, but browser event wiring in [useSceneKeyboard](../src/hooks/useSceneKeyboard.ts) needs integration coverage.
3. Normal pointer and right-click interactions at a compact game size. Keep forced clicks where specifically justified, but use normal clicks in the compatibility smoke so overlays and unreachable hit targets are detected. The older game-close test uses `dispatchEvent`, which similarly does not establish physical clickability.
4. Resume availability: current journeys verify the link URL, not that its target returns a PDF. Check the local artifact in CI if it becomes locally hosted; while it remains external, use a separate availability check before release so external outages do not make every browser journey flaky.
5. Desktop failure recovery for delayed/failed scene art and launch cancellation. Mobile already tests art failure and retry. Add unexpected application error checks to normal journeys; currently only the remaster spec collects `pageerror`.

Do not add E2E tests for every decorative animation or every dialogue branch. Keep detailed logic and branch checks in the existing engine, store and component suites, with representative assembled journeys in Playwright.

## Recommended trade-off

Keep the detailed visual regression suite in Chromium desktop and mobile. Expand meaningful gameplay assertions there, then run a small, screenshot-free set of critical journeys in Firefox and WebKit. Re-enabling a browser does not require duplicating every screenshot: Playwright projects can select different test files or subsets. [Playwright projects](https://playwright.dev/docs/test-projects)

This separates three questions: whether the art and layout changed, whether the player can complete the interaction, and whether that interaction also works in another browser engine. The recommendation is based on this project's painted scenes, canvas interactions, separate mobile experience, and requirement that portfolio content stay easy to reach.

| Layer                                         | Proposed coverage                                                                                                       | Suggested cadence                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Chromium desktop and mobile visuals           | A curated set of distinct scenes, close-ups, shell states, and mobile layouts                                           | Every PR                                                             |
| Chromium desktop and mobile journeys          | Real launch, room travel, hotspots, dialogue, closing and reopening content, direct access to contact/resume/experience | Every PR                                                             |
| Firefox and WebKit desktop functional smoke   | Launch, one real scene interaction and transition, toolbar content access, contact and resume actions                   | Every PR if measured runtime is acceptable; otherwise before release |
| WebKit mobile functional smoke                | Launch Pocket Adventure, touch hotspot, dialogue, close-up dismissal, content shortcuts                                 | Every PR if measured runtime is acceptable; otherwise before release |
| Real iPhone Safari and desktop Safari/Firefox | Short manual pass covering touch, scrolling, audio after a gesture, viewport changes, and clipping                      | Before release and after changes to those features                   |

Do not initially recreate the full Firefox/WebKit screenshot matrix. Add a targeted secondary-engine baseline only after a rendering defect shows that a functional assertion cannot protect an important visible state. Browser/platform baselines need to differ because rendering and fonts can differ; keep committed comparisons in the same Docker/Linux environment as their generation. [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)

## Selecting tests without adding image baselines

Use dedicated functional smoke files selected with each project's `testMatch`, or tags such as `@smoke` and `@visual` filtered with `grep`. Existing tests that combine journey actions and `toHaveScreenshot()` must be separated or refactored before assigning their functional portion to another browser. Merely enabling the currently disabled projects would run the existing screenshot assertions and require additional baselines. [Projects](https://playwright.dev/docs/test-projects), [tags and filtering](https://playwright.dev/docs/test-annotations)

Prefer assertions on player-visible outcomes: destination scene, actual close-up text, dismissible dialogue, correct download or link, and the next usable control. Use engine state only where necessary to observe canvas behavior, together with actual pointer/touch actions. A screenshot of a final state does not establish that the route to it works.

## Runtime and diagnostics

The current config enables the full `chromium` and `mobile-chrome` suites plus the `firefox`, `webkit` and `mobile-safari` smoke subsets. It uses one worker in CI, allows two retries, and captures a trace on the first retry. The workflow already uploads reports with one-day retention. Keep traces and failure screenshots as CI artifacts rather than adding them to Git; they serve diagnosis, while committed baselines serve intentional visual comparison. [CI report artifacts](https://playwright.dev/docs/ci)

Measure per-project duration and retry counts before increasing concurrency. Playwright recommends one worker for stable CI and suggests sharding across jobs for wider parallelization. This repo already uses `fullyParallel: true`, allowing test-level sharding if the suite grows; two shards are a reasonable experiment, not a guaranteed runtime improvement once build/install overhead is included. [CI workers](https://playwright.dev/docs/ci), [sharding](https://playwright.dev/docs/test-sharding)

The workflow builds in its build job and again in E2E; Playwright's web server command builds once more. Consider sharing a production build artifact and serving that in E2E after measuring build cost. The Docker wrapper also installs dependencies for every invocation. Keep the remaster comparison available as an explicit art-review check; consider taking it out of the default PR gate if it no longer represents a supported visitor flow. These are proposals, not changes made by this audit.

Keep retries as diagnostics, and review tests labelled flaky: Playwright distinguishes a first-attempt pass from a test that passes only on retry. A retry should not be interpreted as equivalent evidence of reliability. [Retries](https://playwright.dev/docs/test-retries)

## Browser coverage limits

The current “Desktop Chrome” device preset runs Playwright's Chromium unless a branded Chrome channel is configured. WebKit is a patched build from WebKit sources, not the installed Safari binary; Playwright notes that macOS WebKit gives a closer Safari experience than Linux for platform-dependent features. Device presets emulate parameters such as viewport, user agent, and touch. Consequently, a Linux iPhone WebKit project is useful compatibility coverage but does not replace a short real-device Safari pass. [Browsers](https://playwright.dev/docs/browsers), [device emulation](https://playwright.dev/docs/emulation)

## Repository size and Git LFS

Git LFS stores large file content outside the normal Git object store and commits text pointers instead. This can reduce clone/fetch overhead, but it does not change how many browser journeys or screenshot comparisons execute; addressing test runtime remains a separate task. [Git LFS](https://git-lfs.com/)

Starting to track screenshots with LFS does not convert previously committed binaries or remove them from history. Converting existing history normally requires a migration that rewrites commits and changes their hashes; the no-rewrite option adds a new commit and leaves prior history intact. Treat historical cleanup as a separate maintenance decision after measuring the repository's object size and binary churn. First avoid multiplying baselines and keep transient test outputs in CI artifacts. [Git LFS migration documentation](https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-migrate.adoc)
