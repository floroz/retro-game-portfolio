# Rebuilding a retro portfolio with two AI orchestrators

_What one developer, two model families, and about fifty pull requests taught us about planning work for agents, including the parts that went wrong._

> **Status: living post.** Updated against `origin/v2` at commit `e69c0c3` (2026-09-29, 22:13 local time); the first version was written at `2d06f64` (21:40). The revamp is not finished, and this post will be updated as it lands. See the [Changelog](#changelog). It is drafted by an AI agent (Sonnet) from the plan, the git history, and the pull request descriptions. Anything that is not visible in git or in a PR is marked as such.

## TL;DR

- **The project:** Daniele Tortora's portfolio is a React and TypeScript site dressed as a LucasArts point-and-click adventure, running inside a working Windows 95 desktop (and a Game Boy on mobile). Version 1 was one painted background with five hotspots. Version 2 turns it into a small world: an airport hall and three rooms, one per country he has lived in.
- **The method:** a written plan on a long-lived `v2` branch, read by every agent from `origin/v2`. Two orchestrators, one per model family: a Claude Code (Opus) orchestrator that spawns one sub-agent per task (on Sonnet from 21:46), and a Codex orchestrator that only generates images. The two never share a working tree. They exchange files through a gitignored folder and `DONE` marker files.
- **The pace:** every commit on the revamp is dated 2026-09-29. The plan landed at 10:00 and the last commit at the time of writing is 22:13. In between, 52 pull requests were merged into `v2` (54 were opened, two were throwaway tests), by agents that merged their own work.
- **What went wrong:** the art direction changed three times, and each change was a human looking at the running game, not a failed check. About three hours of pixel-art work (Phase R) was superseded within minutes of being finished. A smooth-rendering path and a smooth font were built in about half an hour and then abandoned, and the font was rebuilt from scratch 45 minutes later. The orchestrator also kept making Daniele's picks for him after he was back at the keyboard, until he asked why. And there were the usual operational papercuts of running many agents at once.
- **What held up:** the scene data contract, the plan-as-single-source-of-truth rules, the lane boundary between the model families, the tooling that measures things (colour contrast, scale, loudness, "is every 2×2 block one colour") instead of asking anyone's opinion, and treating every visual decision as reversible. Since the first version of this post the corrected direction has started to show: the text is now a bitmap serif on the art's own pixel grid, and the toolbar is a painted travel trunk.

![The v1 background: a teal wall with a vending machine, a red banner, a wall clock, a door and a corkboard above a brown checkered floor.](images/01-v1-single-background.webp)

_Version 1: one AI-painted background, five hotspots placed as percentages._

## Contents

1. [The starting point](#the-starting-point)
2. [Framing before building](#framing-before-building)
3. [Creative direction](#creative-direction)
4. [The plan as a spec for agents](#the-plan-as-a-spec-for-agents)
5. [Two model families, two orchestrators](#two-model-families-two-orchestrators)
6. [Git and worktrees](#git-and-worktrees)
7. [Removing friction on purpose](#removing-friction-on-purpose)
8. [The asset pipeline, and three art directions](#the-asset-pipeline-and-three-art-directions)
9. [Engine highlights](#engine-highlights)
10. [Audio no one can hear](#audio-no-one-can-hear)
11. [What went wrong](#what-went-wrong)
12. [The numbers](#the-numbers)
13. [Lessons](#lessons)
14. [What's next](#whats-next)
15. [Changelog](#changelog)

## The starting point

Version 1 shipped in February 2026 (the first commit is a Vite starter dated January 31). On desktop it is a fake Windows 95 desktop with a terminal, a Recycle Bin, and a game window. On mobile it becomes a Game Boy. The game window shows a single painted scene: a pixel-art Daniele walks around a room, and clicking one of five objects opens a section (About, Skills, Experience, Contact, Resume) as a terminal-style overlay.

It works, and it is charming, but it is one picture. Everything a visitor can do happens in the same room, the objects are percentage rectangles laid over a JPEG-shaped background, and the "world" has no depth. The goal for v2 was to keep the concept and deepen it: each section gets its own scene, built from separate assets, connected by exits. The Win95 shell, the Game Boy view, the character as a guide, and the SCUMM-style verb toolbar all stay. Inventory and puzzles are explicitly out of scope.

## Framing before building

Before any code, three things happened, and most of them are not in git.

**Rewrite `AGENTS.md` first.** `AGENTS.md` was rewritten to capture what the project _is_, and every agent reads it. It states the audience (recruiters, hiring managers, engineering peers), and three principles that every change must preserve:

- **Information stays reachable.** A visitor who won't play can still reach contact, resume, and experience within one or two clicks. When immersion and access conflict, access wins.
- **Period authenticity.** Win95 chrome and SCUMM scenes should look and behave like the real thing, not a generic "retro" look.
- **Humor and personality.** The copy uses the self-aware LucasArts voice, never résumé-speak.

The rewrite of its opening sections (premise, audience, principles, direction) landed in the same commit as the first draft of the plan (`14c05cf`, 10:00), which also carries a `Co-authored-by: Cursor` trailer, so part of that draft was made in another tool.

**Agree the creative direction by structured Q&A.** The assistant and Daniele went through the open questions one at a time (what is the entry point, what are the rooms, how does a visitor know where each section lives, how do you travel between rooms). The answers became the plan's decision log: twelve creative decisions (Hall style, London setting, section mapping, exits through the Hall only, one palette with per-scene ramps, and so on). A thirteenth, "visual fidelity", was added when the art direction changed. It briefly went stale (it said 1280×640 after the art spec had moved to 640×320) until the plan commit `469e208` fixed the resolution drift at 21:51.

**Throw away a prototype.** Style questions that cannot be settled on paper were answered with a canvas prototype of one room, in three structural variants: a scrolling corridor, a single-screen office, and a depth-sorted museum. Daniele chose "B's vibe with C's depth": the office mood, but with free-standing objects that the character walks in front of and behind. The prototype was then parked on a branch (`prototype/multi-scene`, 1,949 lines across five files) and never merged. Its Zurich office screenshot survived as a layout reference for the first image prompts:

![The prototype's Zurich office at 320 by 160 pixels: purple striped wall, a window with snowy mountains, six coloured photo frames, a beige computer on a desk, a grey filing cabinet, a door, and a red oval rug.](images/02-prototype-b-office.webp)

_Prototype B, upscaled. It is rough, and it even had text painted into the art, which the plan later banned._

The prototype paid for itself by producing a rule rather than code: **the art provides containers and `profile.ts` fills them.** More on that below.

## Creative direction

The portfolio became a journey through the three countries Daniele has lived in, with Italy standing for "now and next" because he is moving there:

| Scene    | Setting                                                            | Sections           |
| -------- | ------------------------------------------------------------------ | ------------------ |
| Hall     | A 1990s airport terminal: gates and a duty-free shop               | Jumps to all       |
| London   | A pub on a rainy evening, the City skyline in the window           | Skills             |
| Zurich   | A night office overlooking the lake, with the Alps behind          | Experience, Resume |
| Sorrento | A kitchen looking across the Gulf of Naples to Vesuvius and Ischia | About, Contact     |

The Hall is the entry point. Daniele greets you there. Three gates fly you to a country with a _Fate of Atlantis_-style travel-map transition (a sepia map of Europe, a small plane, a red line, a click to skip). A duty-free shelf sells one product per section ("Eau de Résumé"), which jumps straight to the content without the trip. That last part is the "information stays reachable" principle wearing a costume. The toolbar reaches any section in one click from anywhere, and a later hand walk of every scene-to-section combination checked 20 of 20.

### Extensibility: art as containers

Skills and jobs will change. So nothing that changes is painted into the art:

- Content is data. Primary objects only open content screens that read `profile.ts`.
- Collections are **slot rows**: the art supplies one generic sprite (a beer tap, a photo frame, a fridge magnet) and the scene data defines a row of positions. The engine fills one slot per entry in `profile.ts` and folds the oldest into an "and more" object (a cask, a shoebox) when the row is full.
- Each job records a `country`, which decides which room shows its memento. A unit test fails if a job has no country or a row overflows without folding.
- **No text in the art, ever.** Signs, the chalkboard, and the departures board are drawn by the engine, so renaming a job never touches an image.

Adding a skill, a job, or an Italian employer is a data change. That constraint also protects the generated art: image models are bad at text, so removing text from the prompts removed a whole class of defects.

## The plan as a spec for agents

Two files, `docs/expansion-plan.md` (what the world is) and `docs/art-spec.md` (how every asset is made, in what order, by whom), are the whole interface between Daniele and the agents. They are about 1,200 lines together, and the art spec is written like an API document:

- **Task cards** with a lane, an `After` dependency list, an `Owns` line (the only paths that task may write), steps, and a `Done when` check.
- **Status comes from git, not from a table.** An Opus task is done once a PR from its branch is merged into `v2`; a Codex task is done once its `DONE` files exist. The Status column records only gates.
- **Contracts, not prose.** The scene data format is a TypeScript type (`src/engine/types.ts`). The art spec carries a sketch and says outright that where the sketch and the code differ, the code wins. This is a trimmed version of the sketch:

```ts
export const ZURICH_SCENE: SceneData = {
  id: "zurich",
  background: zurichBg,
  walkbox: [
    [8, 108],
    [304, 108],
    [304, 156],
    [8, 156],
  ],
  depth: { farY: 108, nearY: 156, farScale: 0.7, nearScale: 1.0 },
  entryPoints: { fromHall: { x: 296, y: 120, facing: "w" } },
  objects: [
    {
      id: "crt",
      sprite: zurichObjDesk,
      hotspot: { x: 204, y: 56, w: 30, h: 26 },
      interactionPoint: { x: 220, y: 108, facing: "n" },
      baselineY: 100, // character is drawn behind this object while his feet are above the line
      action: "experience", // a section id, or undefined for flavour
    },
  ],
  slots: [
    {
      id: "job-photos",
      kind: "photo-frame",
      source: "jobs:switzerland",
      positions: [
        /* 6 */
      ],
      fold: "slot-photo-frame-more",
    },
  ],
  labels: [{ id: "cabinet", source: "section:resume", x: 262, y: 54 }], // engine-drawn text
  exits: [{ id: "door-hall", to: "hall", entry: "fromZurich" /* ... */ }],
};
```

Coordinates are logical pixels on a 320×160 grid with a top-left origin, and stayed that way through every art change. That single decision is why the art could be redrawn twice without rewriting scene data: the 2× rebuild PRs moved positions by at most a logical pixel or two.

- **The plan lives on `origin/v2` only.** Agents read it with `git show origin/v2:docs/art-spec.md`, never from their own branch, at the start of every task, before every gate, and before opening a PR. Every PR description says `Plan read at <sha>`. Only Daniele edits the plan, directly on `v2`, in small `docs:` commits. An agent that thinks the plan is wrong proposes a change through its orchestrator and keeps following the plan as written. The one exception is this post: at 21:40 (`2d06f64`) the plan gained an "Engineering blog" section that makes keeping `docs/blog/v2-revamp.md` current a requirement, with task card BL. After every gate, direction change, and landed phase the orchestrator dispatches an update, and the blog writer is the only agent allowed to edit `docs/blog/` (on `docs/blog-*` branches, which the plan guard allows). It never edits the plan files.
- **A CI "plan guard"** (`scripts/ci/plan-guard.sh`, task T0.3) fails a PR that edits `docs/` from a non-`docs/*` branch, or whose branch predates the latest plan commit on `v2`. It was tested with two throwaway PRs (#11 and #12), one to fail each rule, then closed. CI ended up advisory for `v2`, so the guard's real job was documentation: the rebase in the merge loop is what actually kept branches current.

Reading the plan back, the sections that earned their keep were the ones that closed loopholes: **Owns lines** (the PR descriptions mention plenty of rebases and almost no conflicts), **"Keeping the plan in sync"** (a stale plan is expensive when a dozen agents act on it at once), and the **Gate log** (below).

## Two model families, two orchestrators

The art spec is written for two orchestrators, one per model family, because the two tools can do different things:

| Actor                                 | Runs                                                                                              | Never does                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Opus orchestrator** (Claude Code)   | Tooling, palette, prompt files, image processing, cleanup, scene data, audio, engine, integration | Generate images                                             |
| **Codex orchestrator** (OpenAI Codex) | Runs prompt files with its built-in image tool and saves candidates                               | Edit code, docs, or anything outside `assets-src/exchange/` |
| **Daniele**                           | Gates: picks, approvals, the final review                                                         | —                                                           |

A note on the table: "Opus" names the orchestrator's lane, not the model behind every agent. At 21:46 (`718d0f5`) the plan recorded that the orchestrator spawns every sub-agent on **Sonnet 5.5** unless Daniele names another model for a task. The commit does not give a reason, and git does not record which model built which PR, so the model behind the earlier task PRs is not something this post can state. This post's own author is one of those Sonnet sub-agents.

Two reasons for the split. First, only one of the tools generates images (the Codex image tool, billed to a ChatGPT plan), and the plan's rule is that no task ever calls a model API. Second, keeping generation out of the coding agents' worktrees makes the boundary physical: Codex writes only to a **gitignored exchange folder** in its own checkout, so candidates never enter history. A candidate reaches `v2` only when an Opus task commits the approved raw as a lossless WebP next to a provenance record.

**The handoff protocol is deliberately dull.** An Opus agent writes a self-contained prompt file:

```md
---
asset: london-bg
task: C2
candidates: 4
references: [assets-src/refs/style-anchor@8x.png]
output: assets-src/exchange/raw/london-bg/
transparent_background: false
---

## Prompt

<full prompt text, style preamble already written in>

## For Codex

<call settings, where to copy outputs from, NOTES.md and DONE>
```

Codex generates exactly `candidates` images, copies them to `output/NN.png`, appends the exact prompt and any deviation to `NOTES.md`, and writes an empty `DONE` file last. Opus agents read candidates by absolute path from the Codex checkout, only once `DONE` exists, and never write there. The Codex orchestrator does not receive events. It **polls**: every few minutes it fetches `origin` and reads the status tables in the plan, and starts anything whose dependencies are met. Its own worktree is detached at `origin/v2` and is refreshed before each batch.

A later prompt file (for the Zurich layers) shows how the format grew: one file, many `items:`, each with its own asset id, references, and a `transparent_background` setting.

**Front-loading foundations.** The reason the fan-out could run in parallel is that the risky, serial work was lifted to the front. Phase 1 built the tooling, froze the palette, wrote all 14 prompt files at once (so no one would wait on prompts), and produced two _anchors_: the approved Zurich composite (the style anchor) and the character turnaround. Every later image referenced those two files. Style drift across independently generated images is the classic failure mode of AI art pipelines, and anchors are the cheap fix.

**A probe first.** Task F2 asked Codex to generate four throwaway images and write down what the tool actually did, and the Gate log records the findings that shaped every later prompt: composites arrive at 1774×887 (already 2:1, and asking for a wider image changes nothing), character sheets at 1536×1024; the "magenta" background is never exactly `#FF00FF` (mostly `#FA03FA`), so keying needs an OKLab tolerance and a flood fill from the edges; the model paints slot items (taps, picture frames) even when told not to, so prompts leave those areas as bare wall; there is more soft lighting than asked for; and edits mostly preserve layout but drift subtly. The probe also found that four images cost about 0.15% of the plan's limit, so candidate counts went up.

## Git and worktrees

`v2` is a long-lived trunk. `main` stays on v1 until `v2` is ready, and **agents never touch `main`** (no branches from it, no commits, no PRs, no merges). One worktree per agent, one per orchestrator:

| Worktree            | Branch                                   | Who                                      | Commits?                                             |
| ------------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| main checkout       | `v2`                                     | Daniele only: reviewing, recording gates | Daniele only                                         |
| `../rgp-codex/`     | detached at `origin/v2`                  | Codex orchestrator and its sessions      | Never; writes only to the gitignored exchange folder |
| `../rgp-opus/`      | detached at `origin/v2`                  | Opus orchestrator, for coordinating      | Never                                                |
| `../rgp-<task-id>/` | `assets/<task-id>` or `engine/<task-id>` | One Opus agent per task                  | Yes: one PR per task                                 |

Orchestrators sit on _detached_ heads because a branch can be checked out in only one worktree, and Daniele's main checkout owns `v2`.

**The agents merge their own work.** There is no human approval step for a task PR. The loop, from the plan:

1. Finish the task, `git fetch origin && git rebase origin/v2`, resolving conflicts by rule.
2. Re-run the card's `Done when` checks locally, then `git push --force-with-lease`.
3. `gh pr merge --squash --delete-branch`, immediately. Do not wait for CI.
4. If the merge is refused because `v2` moved, go back to step 1. After three failed attempts, stop and report to the orchestrator.

The conflict rules are unambiguous and fit on one screen. In the task's own paths, keep both sides' intent and re-test. In another task's paths, keep `v2`'s version (and escalate if the task really needs a change there). For `package-lock.json`, keep `v2`'s and re-run `npm install`. For binary files, the owning task wins, and never merge by line. For `docs/`, always keep `v2`'s. Only the final integration task may touch every scene.

One side effect of using the developer's own git identity: all 93 commits on the revamp show a single author, Daniele Tortora. Git alone cannot tell you who did what. The PR descriptions do, with their `Plan read at` lines and their "Generated with Claude Code" footers.

## Removing friction on purpose

Two decisions traded safety for throughput, on purpose:

**CI and E2E were declared advisory for `v2`.** GitHub checks and the Playwright suite belong to v1 on `main`. On `v2`, the only verification is each task card's local `Done when` (typically `npm run lint`, `npm run test:unit`, `npm run build`). The alternative was every agent waiting on a slow CI run on a branch that changed every few minutes. The cost is real and is discussed under [What went wrong](#what-went-wrong).

**Gates were delegated.** Daniele's picks are the actual bottleneck in a pipeline like this, so when he stepped away, the Opus orchestrator was authorised to pass the palette, anchor, and audio gates and to make every candidate pick. Each decision and its reasoning goes in the plan's **Gate log**, and Daniele can overturn any of them. The final review before `v2` merges into `main` (G4) stays with him.

This delegation came with a flaw that only showed later, and it is covered under [What went wrong](#what-went-wrong): it was written as "until he says otherwise", and nothing said what should happen when he came back.

The Gate log has 19 rows. Fourteen were decided by the orchestrator. Five are Daniele's: the Phase H checkpoint (HG1) and, from 22:03, the four Phase H scene and map picks, recorded as "Daniele (on the orchestrator's recommendation)". Some entries are worth quoting for the reasoning quality. On the character turnaround: candidate 06 won because "it has the cleanest remap: the least brass on the skin, the lowest noise, a strong silhouette with arms clear of the torso", and the jeans were recoloured to denim during cleanup, "which is cheaper than cleaning 02's noise to get its denim". On audio, the orchestrator wrote that it "can't hear audio" and approved the motif "on objective evidence only: Daniele to listen".

## The asset pipeline, and three art directions

This is the honest part of the story. The pipeline is what makes a generated image usable in a game; the art direction is what moved.

### Direction 1: pixel art at 320×160 (Phase 1 and 2)

Generated images are not pixel art. They are images of pixel art. Phase 1's pipeline, built as a set of TypeScript scripts under `scripts/assets/`:

1. **Generate.** Codex makes 4 to 6 candidates per composite from a prompt file.
2. **Pixelize.** Crop, area-average downscale to 320×160, then map every pixel to the nearest allowed palette colour **in OKLab** (a perceptual colour space, so "nearest" means "looks nearest") with no dithering. The palette is 26 core colours plus a 9-colour ramp per scene, and a validator enforces that each scene uses only the core plus its own ramp.
3. **Review.** A numbered review sheet at native size ("judge at native size: a beautiful raw image can pixelize into mush").
4. **Clean up** in palette-index text grids: the image as one character per pixel, patched by region, so an agent that cannot "see" can still edit an image with exact, diffable text.
5. **Validate.** `lint:assets` fails on off-palette pixels, partial alpha, wrong sizes, bad names, and a missing provenance record.

Every shipped file has a provenance JSON (which prompt, which candidate, which references, which cleanup, who approved), because "models get retired, so the approved raw candidate is the only thing an asset can be regenerated from".

![Two stacked images of the Zurich office. Top: the raw Codex candidate. Bottom: the cleaned 320 by 160 style anchor with flatter fills and a redrawn window and cuckoo clock.](images/03-raw-candidate-vs-320x160-anchor.webp)

_Top: a raw Codex candidate for the Zurich style anchor. Bottom: the anchor after pixelizing and grid cleanup._

Between 13:58 and 15:53 that afternoon, 20 PRs merged: the tooling, all five scenes, the shared slot sprites, the character sheet, 29 audio files, and the engine (scene loading, multi-scene rendering, travel map, terminal routing, audio playback, a dev overlay).

**What the builders learned that the plan did not know.** The agents building scenes hit the limits of the generated art, and their PR descriptions are the best source of what actually happened:

- The London build (#30) says the remap "was too mushy to clean pixel by pixel: the door was nearly black, the panelling noisy, and the lamps cast light cones", so the room shell was **repainted procedurally** on the candidate's layout. The Hall build (#29) did the same for most of the room, because the gate signs needed far more room than the candidate left for them.
- The character (#28) was supposed to come from Codex animation sheets. Only one walk sheet was usable, and "at native size, 03's own pixels were too noisy and bulky", so the frames were rebuilt from the approved turnaround, keeping only the generated poses and timing. Five of the eight tags were built directly from the anchor.
- Sorrento's chosen candidate had a fridge and door "more than twice the character's height at the back wall", so they were redrawn smaller. A world scale problem, noted and fixed locally, and (spoiler) it came back as a global rule later.
- Three rules for the scene contract came out of the Zurich build (#24): walkboxes have no holes, so free-standing furniture needs "keyhole" slits from the back edge; hotspots hit-test in list order, not by depth; animation strips must be 320 px or narrower. Each was added to the plan and to the engine's overlay warnings.

Then Daniele played it.

### Direction 2: the 2× remaster (Phase R)

His review of the running game said: the proportions were off, the text was hard to read, and it was still too low-resolution. In his words, Monkey Island 2, not 3. Git shows the review as a 1 hour 42 minute gap with no merges (15:53 to 17:35), followed by a new plan section.

Phase R kept everything (scenes, layouts, objects, moods) and redrew it at **2× pixel density**: 640×320 backgrounds, a 64×128 character cell, a palette extended by 24 colours (the original 62 indices were frozen by a test, and the new ones took punctuation characters as indices). It also added a rule born of a bug that Phase 2 had exposed: in the Hall, the carpet used the same navy as Daniele's sweater, so his torso vanished. The fix was made a measurable invariant:

> No floor, rug, or large surface behind the character may use a colour within **0.08 OKLab** of the character's clothing and hair colours.

Then a contrast-walk tool (I2, #44) rendered every scene with the real character at every walkbox point on a 5-pixel grid, in five poses, 2,603 positions per run, and measured the OKLab distance between the character's outline and the pixel next to it. The results were not a clean pass. Zurich's hair edge was under the threshold 69.8% of the time before the fix and 23.3% after; some remaining failures were left in place with a written reason (thin dark baseboards and dark wood behind a navy sweater, where the hue differs).

Phase R ran from 17:35 to about 20:36: 14 PRs, including the engine's density support (#33), the tooling (#32), and a rebuild of every scene, the character, and the shared sprites at 2×. Picks for the rebuilds were delegated to the build agents on objective criteria: layout fidelity measured region by region, in mean OKLab distance at the best offset within ±8 pixels, surface cleanliness, and the contrast rule. The Hall PR (#40) has a 15-row table of those measurements, and its chosen candidate (04) was the one with the smallest mean offset (7.0 versus 9.7 to 10.7 px).

Those are good measurements of the wrong thing. They measured how faithfully a candidate reproduced the _previous_ layout, and the target was about to move.

![A screenshot of the Sorrento kitchen at 2 times pixel density: a terracotta wall, a green door, a white fridge with an ABOUT note, a window over the bay with Vesuvius, a yellow tablecloth, and a stove with a moka pot. A three-line speech bubble in a pixel font covers the window.](images/04-sorrento-2x-remaster-feedback.webp)

_Daniele's screenshot of the 2× Sorrento, sent with his feedback: the text is hard to read (here it sits over the window), the proportions are off, and it still reads as low resolution._

### Direction 3: Phase H, and a correction to the correction

Phase H's first version, committed at 20:46, listed his complaints in the commit message: "still too low-res, character proportions off, text unreadable". The new target was _The Curse of Monkey Island_ (MI3): hand-painted cartoon art, with bold ink outlines, at 1280×640 with **no visible pixels**, a cut-out-puppet Daniele, layered generated assets instead of hand-cleaned pixels, and a smooth font (Fredoka). Then the developer looked at the game again, this time with an MI3 screenshot next to it, and the plan changed again 29 minutes later. From the commit message at 21:15:

> Daniele: the smooth font breaks the style; The Curse of Monkey Island is the reference for both image pixel sharpness and text. Painted full-colour art on a 640x320 grid displayed with hard pixels, and an MI3-style serif bitmap font.

MI3 is 640×480 hand-painted art on a crisp pixel grid, shown at 2× with hard pixels. So the reference for _sharpness_ and for _text_ was hard pixels, and "HD" was the wrong reading of "better". The final Phase H rules:

- **Art at 640×320, displayed at 2× with nearest-neighbour.** That is the same density as Phase R, but painted full colour, at most 256 colours per scene, with no dithering noise and hard alpha. No master palette.
- **A serif bitmap font** on the same grid (white letters, hard 1px black outline, no anti-aliasing), rasterised from an openly licensed serif typeface. (Task T3, which landed at 21:55. See [Text, twice](#text-twice-from-smooth-to-a-bitmap-serif).)
- **A world scale sheet.** Daniele is 72 logical pixels tall (45% of the scene height) at the front of the walkbox and 58 at the back, and everything else is a ratio of his back-of-room height: doors 1.3×, a fridge or filing cabinet about 0.95×, a table 0.45×, a chair back 0.55×, a bar counter 0.6×. Every prompt includes the sheet as a reference image.
- **A cut-out puppet Daniele:** one drawing per facing, split into ten parts (torso, head, upper arms, forearms, thighs, shins), with head variants for mouth shapes and blinks, animated in-engine by keyframed poses. His likeness is identical in every frame because it is the same drawing.
- **Generated layers, not hand-cleaned pixels.** For each scene, Codex makes a full composite (for the pick and as the layout reference), an empty-room plate made by editing out the furniture, each free-standing object separately on transparency, and each moving prop separately. Opus crops, keys, aligns, and writes scene data, but "doesn't paint pixels".
- **Effects are procedural:** rain, steam, stars, sea glints, the split-flap flutter, and fruit-machine lights are code, not sprite strips.
- **A human checkpoint.** Daniele would pick the HD anchors himself.

The correction also needed its own tooling, and it arrived as H0b (#56, merged 21:31, +1,629 lines) about a quarter of an hour after the plan changed. The 1280×640 tooling (H0) had been built for a target that no longer existed, so H0b added a **painted** mode to the same pipeline (`assets:prepare --painted`, `assets:quantize`, `assets:rig --density 2`):

- A scene comes out at 640×320 with **hard alpha** and at most **256 colours**, with no dithering, so gradients become bands instead of noise. The palette is quantised in OKLab with a weighted median cut, refined by k-means. Resampling defaults to Lanczos because it keeps ink lines crisper.
- **Joint per-scene palettes.** `assets:quantize` builds one palette for all of a scene's layers together (or `--palette-from` pins the colours of one file and adds new ones only up to the budget), so an object cut out of a scene does not shift colour against the plate behind it.
- The validator learned `"density": 2, "style": "painted"`. It drops the master-palette rules and checks instead that scenes are 640×320, sprites have even sides, alpha is hard, each scene folder stays within 256 colours across all its painted files, and a scene never mixes painted and pixel art. Phase R's pixel-art rules still apply to anything without `style`.

At the checkpoint (gate HG1), the orchestrator had recommended Zurich candidate 01. Daniele picked 04, the one with diagonal moonlight across the wall. For the character he picked candidate 01, "the clearest cartoon likeness". The candidates he saw had been put through the corrected pipeline first (640×320, 256 colours, shown at 2× nearest), so he was judging what would actually ship, not a raw generation.

![A two-by-two sheet of four candidate Zurich office images, in a painted cartoon style with a purple striped wall, a lit window with snowy mountains and a night lake, a desk with a computer and green lamp, a red rug, and a filing cabinet. Candidate 04 has diagonal moonlight across the wall.](images/07-hd-zurich-candidates.webp)

_The four Zurich HD candidates, as shown at the checkpoint. The orchestrator recommended 01; Daniele picked 04._

![A review sheet of four character turnaround candidates, each showing a bearded man in a navy sweater and jeans from the front, side, and back.](images/08-hd-daniele-candidates.webp)

_The four Daniele candidates. He picked 01._

To prove the world scale before committing to it, an agent composited the approved Zurich anchor with the approved character at three positions and measured the result: the door is 1.3× his back-of-room height, and he stands 288 display pixels tall at the front.

![The HD Zurich office with three copies of the bearded character at different depths: a small one at the left, one beside the filing cabinet and door, and a larger one at the front right.](images/09-scale-composite.webp)

_The scale composite that fixed the world scale._

HG1 passed at 21:30 (#55), and the fan-out followed within minutes. Codex ran HC2 to HC4 (the Hall, London, Sorrento, and the travel map; the character's parts and mouth shapes; the shared sprites). The layer prompts were next: HL-zurich (#57, `layers-zurich.md`) asks for nine items at three candidates each, an empty-room plate made by _editing_ the chosen composite (desk, chair, cabinet, plant and door removed) and then each object and the cuckoo as separate sprites on transparency, with the stars, lake glints, and CRT cursor left out because the engine draws them. Codex has since finished all nine (the exchange folder has a `DONE` file in each), which by the plan's own rule makes HC5-zurich done, although the status table on `v2` still says `todo`. It is the first test of the layered approach, and no one has assembled a scene from those layers yet. The other three scenes' layer prompts followed at 22:05 (#61: five items for the Hall, eight for London, nine for Sorrento, each with its chosen composite committed as a lossless reference), so all four rooms now have prompts and 31 layer items are queued or generated in total.

**The cost of getting the direction wrong twice.** Two engineering artefacts of the first Phase H reading became dead code, which is worth being honest about:

- The **density-4 smooth rendering path** (#47, 415 added lines) was merged at 20:57. After the 21:15 correction, its own follow-up PR (#52) says the density-4 stand-ins now need a `&smooth` flag and "that path stays merged and unused". It is still there at the time of writing: the density value, the display-resolution canvas backing, and a dev-only placeholder script. Nothing shipped depends on it, and nothing has removed it.
- **T1 (#50)** built crisp display-resolution text in Fredoka, and deleted the engine's pixel-font glyph tables in the same PR (+733 / −2,448 lines). Five minutes after it merged (21:10), the plan said the text should be a pixel font again. The replacement, T3, could not resurrect the old glyphs and built a new face (below). This one _is_ cleaned up now: the toolbar rebuild (UI1) removed the last user of Fredoka, and its font files, `@font-face`, and preload went with it.

Neither blocked anything else, and the whole detour lasted less than an hour of wall-clock time. But this is exactly the kind of work that a person's five-second look at a reference screenshot would have prevented.

### Minimal in-world text

One more correction came from the Hall. Daniele's review of it was an "overdose of text" (his words as relayed to the writer, not visible in git): his screenshot showed a departures board listing every section, gate signs listing sections, shelf labels, and a four-line greeting, all at once. The scene was legible in isolation and useless as a place. The fix was a plan-level rule (commit `d86395c`) and a matching PR (#51, T2, 21:19):

- In-world text is at most one word or a city name per object. The Hall's gate signs now say only "GATE 1 / LONDON", the departures board lists three city names, the duty-free shelf labels are gone (hovering still says "Open Resume: Eau de Résumé"), and the greeting is "Welcome aboard! Pick a gate, or use the toolbar."
- Spoken lines are 12 words or fewer, enforced by a unit test that walks every scene. Label tests enforce "a word or two".
- The **toolbar** carries the mapping instead. In T2's version every section button got a small country badge (Big Ben, an Alp, a lemon), hovering said "Skills, in London", and in a country scene that scene's buttons lit up. T2 checked the result with Playwright: every section opens in one toolbar click from each of the four scenes, 20 of 20.
- The Hall's HD prompt was rewritten in the same PR to ask for small, slim gate panels, a small three-row board and an unlabelled shelf, so the next round of art is built for less text.

![Two stacked screenshots of the airport hall. Top: signs and a departures board covered in text, with a long four-line greeting. Bottom: gate signs that only say GATE 1 LONDON and so on, a board with three city names, and a one-line greeting.](images/05-hall-too-much-text-before-after.webp)

_The Hall before and after "minimal in-world text"._

The badges lasted about 40 minutes. A screenshot Daniele took at 21:34 shows the T2-era buttons and the status line, and by 21:35 the plan had a new task (UI1) to redesign it for the MI3 look, with his review note attached: "the toolbar looks awful".

![The game's toolbar: dark panel with buttons EXPERIENCE, SKILLS, ABOUT, CONTACT and RESUME with small badges, the status line saying Look at desk, and GITHUB, LINKEDIN, TALK and SOUND OFF buttons on the right.](images/06-old-toolbar.webp)

_The toolbar before UI1._

### Text, twice: from smooth to a bitmap serif

The text went through two versions in 45 minutes, and the second one is the one that finally looks like the reference.

**T1 (#50, 21:10): smooth text.** A second canvas over the scene, sized to the on-screen size times `devicePixelRatio` (never below 1280×640), with Fredoka SemiBold drawn with a round dark outline and a soft shadow. It was crisp, big, and readable, and it answered the complaint that the text was hard to read (the Sorrento screenshot earlier in this post). Then Daniele put an MI3 screenshot next to it. In the plan commit's words (`d2452d8`), "the smooth font breaks the style": it looked like a modern UI laid over pixel art, the kind of modern flourish `AGENTS.md` says to leave out. He pointed to _The Curse of Monkey Island_ as the reference for both the sharpness of the art and the text.

**T3 (#59, 21:55): an MI3-style serif bitmap font.** The agent worked from the reference at every step:

- **Typeface.** Libre Caslon Text (SIL OFL 1.1). The agent compared it with Crimson Pro, EB Garamond, Alegreya, Cardo, Gentium and Spectral against the MI3 reference, and it was the closest. The licence file ships with the atlases.
- **Rasterizer.** `scripts/fonts/rasterize.py` (Pillow and fontTools, run once, output committed) instances the font at one weight, renders every glyph **1-bit** with FreeType's autohinter (no anti-aliasing), spaces glyphs by their ink, and turns the font's kerning into whole pixels. The output is a set of text-grid atlases, `serif-regular.txt`, `serif-small.txt`, and `serif-tiny.txt`, the same "an image as characters in a file" trick used for palette grids. A few glyphs did not survive automatic hinting and are **hand-tuned overrides** (regular `s`, small `S`, tiny `A`, `S`, `I`) that the script re-applies whenever it runs.
- **Three sizes on the 640×320 grid.** Regular (cap height 12 art pixels, 19 per line) for speech, small capitals (cap height 8) for signs, the board, the map and captions, and a tiny size used only as a fallback.
- **MI3's look.** Each line is composed as 1-bit masks: the letters, a hard 1-pixel outline grown on four sides, and for speech a 1-pixel drop shadow down and to the right, as in the reference. Speech is white with a black outline and shadow. The text canvas is a fixed 640×320 drawn pixelated, so text pixels and art pixels are the same size.
- **Fitting.** A bitmap cannot scale, so a label that is too wide is fitted by steps: wrap first, then close the letters up by one pixel, then drop to the next size, and every line of a sign gets the same setting.

![A Sorrento kitchen in pixel art with a three-line speech line in white serif letters with a black outline, wrapped across the window.](images/12-bitmap-serif-speech.webp)

_The Sorrento kitchen with T3's speech: a white bitmap serif on the art's own grid._

The PR is +16,984 / −325 lines, and about 15,800 of them are the glyph atlases, which is why `src/` in [The numbers](#the-numbers) looks so much bigger than it did in the first version of this post. The engine surface is small: `font.ts` exposes `measureText`, `wrapText`, `fitText`, `drawText` and a helper to render lines onto a canvas of their own, and it was written for the next task to reuse.

### The toolbar becomes a travel trunk (UI1)

UI1 (#60, merged 22:02, +1,509 / −800 lines across 26 files) is the first task where the agent was told to _propose_ before building. The PR opens with three concepts:

1. **A slim painted interface strip** of wood, brass and parchment. Period-right, but on its own just the old toolbar reskinned; the country mapping would still hang off a corner badge.
2. **A travel kit on a trunk:** boarding passes, destination stamps and luggage-tag sections. Diegetic, and it fits an airport story.
3. **An MI3 verb coin.** The most authentic, but it is hidden until you press and hold, so it fails one-click reach and discoverability and could not be the whole interface. (The `AGENTS.md` principle "information stays reachable" rules it out.)

The choice was 2, painted in the style of 1: a **travel trunk**. A wooden lid with a brass edge runs under the scene:

- A **sentence line** in a dark groove along the top, as in SCUMM. It says "Walk to" when idle, "Look at desk" or "Skills, in London" on hover or keyboard focus, "Off to Zurich: Experience, Resume" in flight, and "Click to skip" during a trip.
- **One boarding pass per city**, in journey order (London, Zurich, Sorrento), with a torn-off stub carrying the city's emblem (Big Ben, the Alps over the lake, a lemon), a header in the city's colour, and one row per section that lives there. The grouping teaches the mapping: a section sits on its city's ticket, so the corner badges and any extra in-world text are not needed.
- **A passport stamp for "you are here".** The current city's ticket gets a gold rim and a red entry stamp with a plane in it. During the travel map the destination's ticket is already stamped, and the Hall stamps none.
- **Four brass fittings**, two by two: Talk, Sound, GitHub and LinkedIn.

![Two stacked crops of the game's control bar in the Zurich room. Top: the old flat purple buttons with country badges and a yellow status line. Bottom: a painted wooden trunk with a Walk to sentence line, three cream boarding passes headed London, Zurich and Sorrento, a red stamp on Zurich, and four round brass buttons.](images/11-toolbar-before-after.webp)

_The control bar before and after UI1, in the Zurich room._

A few details worth keeping. The trunk is drawn **entirely in code**: emblems and fitting icons are small ink-outlined sprites in `sprites.ts`, laid out in art pixels by `layout.ts`, and painted by `paint.ts` onto one 1280×160 canvas. The PR notes that no Codex prompt was needed. The text is T3's bitmap serif, and a browser test asserts that **every 2×2 block of the whole canvas, text included, is a single colour**, the same "measure it" reflex applied to the pixel grid. Over the canvas sit real `<button>` and `<a>` elements, so the keyboard and screen readers get the same trunk: each ticket is a group named after its city, each row is labelled "Resume, in Zurich" (plus "(you are here)"), Sound is `aria-pressed`, and Tab walks London, Zurich, Sorrento, then Talk, Sound, GitHub and LinkedIn.

It also deleted a lot: the old `ActionGrid`, `IconGrid` and `CountryBadge`, the `lucide-react` dependency, and the Fredoka font. The store, the verb-shortcut flow and the Game Boy view were left alone, and the E2E selectors moved from `getByTitle` to `getByRole` names. The PR was checked with 503 unit tests and 25 browser tests; the E2E suite has still not been run on `v2` (see [Debts](#debts)).

![The airport hall in pixel art with the trunk control bar underneath. The sentence line reads Skills, in London. Gate signs read GATE 1 LONDON, GATE 2 ZURICH and GATE 3 SORRENTO in a white-on-navy serif, and the greeting is a two-line white serif.](images/13-hall-trunk-and-bitmap-text.webp)

_The Hall after T2, T3 and UI1 together, hovering "Skills". The art underneath is still the Phase R pixel-art version._

The travel-map transition is the scene most likely to keep its mechanism through all three directions, though not its picture: Daniele has picked a new, painted map (candidate 03) that will be re-registered to the new coastline in HB5.

![A sepia map of Europe drawn in flat pixel art, with a small aeroplane flying a dotted red route from the middle of France toward London, a red marker on Zurich, and the label LONDON.](images/10-travel-map-transition.webp)

_The travel map mid-flight, with the engine-drawn label and the old toolbar's status line reading "Off to London: Skills"._

### The Phase H scene picks, and who was picking

The four remaining Phase H scene and map candidates were picked after HG1 and logged at 21:58: Hall **02** (the only candidate whose gate boards are big enough for "GATE 1 · LONDON" in the bitmap font), London **02** (the clearest chalkboard, a readable skyline, the fruit machine fully in frame), Sorrento **01** (the sun setting over Ischia, Vesuvius, the Naples shore), and the travel map **03** (the cleanest two-tone sepia with no painted markers or text). The reasoning is in the Gate log. What is worth telling is the attribution: the plan commit that logged them at 21:58 (`1f50c55`) recorded the orchestrator as the decider, and the next one at 22:03 (`c872bcb`) changed the same four rows to "Daniele (on the orchestrator's recommendation)". The candidates did not change, only who they belong to, and the PR that wrote the next layer prompts (#61) says the picks "were confirmed by Daniele". [What went wrong](#what-went-wrong) says why.

The new rule was exercised within ten minutes. The next task, HB6 (#62, merged 22:12), turned the shared sprites (beer tap, photo frame, fridge magnet, their "and more" fold objects, the map marker and the plane) into painted density-2 art, and its PR says "Daniele chose the recommended mix from the HC4 sheet": the build agent stopped at the pick, Daniele made it, and the provenance records say `approvedBy: "daniele"`. It is also the first output of the painted pipeline: cut from the raw sheet, `assets:prepare --painted`, a 1-pixel ink edge added to each silhouette because the downscale loses the painted outline, and one joint 256-colour palette for all eight files. The plane is rotated to eight headings and mirrored across its own axis for four of them so the light stays top-left.

## Engine highlights

The engine work (`src/engine/`; `src/` as a whole grew by about 30,000 lines, of which roughly 15,800 are the font atlases) was the most stable lane, and largely because of two decisions.

**A pure, declarative scene contract.** The engine reads `SceneData` and renders. It does not know what a "pub" is. Scenes are data files owned by build tasks, and the contract tests check every scene: exits point at real entry keys, stand points are on the walkbox, every primary object exists, and every string fits.

**Density as a detected property, not a switch.** When Phase R doubled the pixel density, the engine did not change scene data at all. Positions stay in logical 320×160 pixels. Each image draws at its own density, detected from its size against a table, and objects take their density from their scene's background, so a scene can be switched to 2× in one PR while the others stay at 1×. That is how nine rebuild PRs could land in a row without breaking the game. It also is why the third art direction (640×320 painted) reused the same code path, with only new validator rules (`"style": "painted"`). The exception is the density-4 path built for the first Phase H reading, which added a fourth density value and a display-resolution canvas and is now unused (see above).

Other pieces worth noting:

- **Slots and folding.** Rows of taps, photo frames and magnets are filled from `profile.ts` at runtime, with a fold sprite in the last slot when entries exceed the capacity.
- **A cut-out rig.** The contract between the packer (`assets:rig`) and the renderer is a single TypeScript file (`src/engine/rigTypes.ts`), merged _before_ the renderer (H0, #46), so both sides could be built in parallel. The renderer (E4 part 3, #52, +2,620 lines) does a joint chain with per-part pivots, then named pose clips (`walk-side/front/back`, `idle-*`, `use-e`, `use-n`, `talk-*`) keyed on angles, stretch and root offset, with **Catmull-Rom interpolation** between keys. Walks advance by distance, one cycle per the rig's measured stride, so the feet do not slide: a `groundLock` keeps the lowest sole on the floor and a `footLock` pins the planted heel exactly through its stance (unit tested, with a slide readout on a clip preview page). Blinks are a 120 ms head swap every two to four seconds, and lip sync swaps mouth-shape heads from the letters of the spoken line (vowels open, o/u round, m/b/p closed). Parts are rasterised on the 640×320 grid with hardened alpha and stamped on whole grid pixels, so the CSS 2× upscale stays crisp. The rig and the art it needs (task HB7) do not exist yet, only the engine side against a rectangle placeholder with Phase H proportions. The Codex part and head candidates (HC3) exist, and Daniele has not picked from them.
- **World scale in data.** Scenes say how tall Daniele is at the far and near edges of the walkbox in logical pixels (`farHeight: 58`, `nearHeight: 72`, E4 part 2, #48), not a scale factor, so the puppet, the sprite sheet, and the art all agree. Scenes built to the world scale use the rig; the rest keep the sprite sheet, which is how the engine lands ahead of the art.
- **Procedural effects and moving props** (E4 part 4, #54). Rain, steam, stars, glints, lamps (chase, alternate, random), and a split-flap flutter are functions of a deterministic hash of the effect's id and index, never `Math.random`, so a scene looks identical on every visit and can be unit tested. Shapes snap to whole grid pixels. Moving props (the bus, the ferry, planes taking off, the cuckoo popping out of its door) are ordinary sprites sliding along keyed paths on a schedule, with easing and a sound played as each pass starts. Because the art is now layered, these are what let the room move without animation sheets.
- **A shared bitmap-font module** (`font.ts`, from T3): `measureText`, `wrapText`, `fitText`, and `drawText` in logical pixels, used by the world text and by the control bar's sentence line, so there is one text renderer for both.
- **No flash on load.** Image preloading starts while the welcome screen is up, and the renderer holds the last frame until the next one's images are loaded (or have failed, so a missing file cannot freeze the game).
- **A dev overlay** (`?debug=scene`) that draws walkboxes, hotspots, interaction points, baselines, slot positions and label anchors, with live warnings and shift-click to copy coordinates. Every build task relied on it, and several PRs mention checking their work there.

## Audio no one can hear

Music is code. Each track is MIDI written as a phrase notation in TypeScript (`A4:.5 C5:.5 F5:1@96 | Bb4+D5:2 r:2`, where each `|` is a checked bar line), rendered by FluidSynth with a MIT-licensed General MIDI soundfont, and encoded to MP3. All four room tracks share one motif, "the boarding call", varied per country: a bossa-nova Hall theme in F major, a music-hall bounce in London, a music-box waltz in Zurich, and a 6/8 Neapolitan tarantella in Sorrento. Sorrento was later re-rendered with the soundfont's real mandolin and Italian accordion (a bank-select patch in the renderer) instead of the General MIDI stand-ins. Ambience and 20 sound effects are synthesised from code by a seeded, deterministic toolkit, and re-rendering yields byte-identical files.

No agent can hear the results, and the plan says so. So the gates were passed on objective evidence:

- **Loudness:** every track measures −20.0 LUFS integrated (ambience −28), and effects are capped at −16 LUFS on playback by a gain table in the engine, with a unit test that fails if the table drifts from the provenance records. The cap exists because a measurement showed the fruit machine at about −8 LUFS and the cuckoo at −10, several dB above the music.
- **Loop seams:** MP3 encoder padding breaks `<audio loop>`, so the engine decodes with Web Audio and loops with `loopStart`/`loopEnd`. Each render folds the reverb tail back onto the start of the loop. The Hall theme is sample-identical across the seam in the WAV, and in the MP3 the seam difference is −33 dB against −23 dB of codec noise. Two different decoders (ffmpeg and CoreAudio) give matching figures.

That is real evidence that the audio is technically correct. It is not evidence that it is good. Daniele has not yet listened to it, and the Gate log says so.

## What went wrong

### Design and direction

- **Three art directions in one day.** The first two came from a human looking at the running game (not from a failing check), and the second was itself corrected by a screenshot of a commercial game. Text and the control bar followed the same pattern on a smaller scale: the Hall's text was cut after a review (T2), the smooth font was replaced after a side-by-side with the reference (T1 to T3), and the toolbar's corner badges were replaced by a new design within 45 minutes of being merged (T2 to UI1). All the agent-side verification, including the review sheets, the OKLab picks, and the contrast walk, passed the whole time. Objective gates are excellent at "is it correct" and silent about "is it right".
- **Delegated picks measured the wrong thing.** See above: layout fidelity to the previous scene is a fine tie-breaker and a poor stand-in for taste. The one gate Daniele kept for himself, HG1, produced the one place the orchestrator's recommendation was overruled.
- **Delegated authority went stale.** The picks were delegated in the morning with the words "until he says otherwise", because Daniele had stepped away. He came back, made the HG1 pick himself at 21:30, and the orchestrator kept picking everything else. It was following the plan as written: the Phase H section said the checkpoint was the exception and "every other gate stays delegated to the Opus orchestrator". So at 21:58 the log has the orchestrator choosing the Hall, London, Sorrento and travel-map candidates for a person who had already returned to the loop. Daniele's reaction, as relayed to the writer (not visible in git), was "shouldn't I decide the picks?" The plan commit at 22:03 says he should: every Phase H pick (scenes, character parts and heads, shared props, UI art) goes to him, with the orchestrator's recommendation and candidates rendered as they will ship, and build agents **stop at the pick and wait**. The delegation had a reason but no expiry and no trigger. Nothing told anyone to re-check it when the person it stood in for returned, and the plan is a document that only changes when someone edits it. It happened to cost nothing, since Daniele kept all four recommendations, but that is luck, not process. The cleanup is incomplete as well: the "Delegated gates" paragraph at the top of the art spec still says the orchestrator "makes every candidate pick".
- **Generated art needed more human-scale rescue than the plan assumed.** Multiple build PRs repainted large parts of scenes procedurally, and the character was rebuilt from the anchor. Phase H is a bet that changing the lane (layers and procedural effects instead of pixel cleanup) fixes this. It is not yet tested. Only Zurich's layers have been generated (nine items), and none have been assembled into a scene. The Hall, London and Sorrento prompts landed at 22:05.
- **The plan's own files drift, every time it moves.** The first version of this post reported that decision 13 and the "Resolution" note in the expansion plan still said 1280×640 while the art spec had moved on. A plan commit fixed that at 21:51 (`469e208`), and the same kind of gap reopens within minutes: as this post was being finished, the art spec's status tables showed UI1 as `todo` although it had merged (a plan commit at 22:06 fixed that), and they still show the blog task as `todo` and HC5-zurich as `todo` although its `DONE` files exist. The tables are meant to be read against git, and the plan says so, but a reader who stops at a table gets a wrong answer. Every change of direction is a cross-file edit, and cross-file edits get missed.
- **Scope changed under a running agent.** The I1 agent was told mid-task that Phase R was redrawing every asset, so its art items moved to I2, and "an art branch I had started was dropped unmerged" (#43).

### Process and operations

These are from the working sessions rather than from git, so they are reported, not proven by the repo:

- **Agents killed each other's dev servers.** With many agents running `npm run dev` on shared ports, one agent's cleanup could take down another agent's server. The fix was a port policy, plus the standing rule never to stop a process you did not start.
- **File watchers missed events.** Agents that relied on a watcher to notice new files were switched to direct checks (for example, testing for the `DONE` file).
- **`gh pr merge` failed its local cleanup** because `v2` was checked out in the main checkout, which stops `gh` from switching to it after the merge. The merge itself had gone through, so agents learned to verify the merge and delete the remote branch rather than retry.
- **Parallel doc commits forced rebases.** Every agent's PR is rebased onto `v2` before merging, and a plan commit landing in the middle of a batch invalidates every open branch (that is what the plan guard checks). The fix was to batch plan updates: the git log shows single `docs:` commits carrying several changes ("pass G2a; unlocks C1–C4, B1, B6").
- **The Codex orchestrator stopped polling once** and had to be restarted. Long-lived agents that wait are the least reliable kind.
- **A permission check blocked sub-agent merges early on,** which meant a human had to step in until it was sorted out.

### Debts

- **`v2` has not been through E2E since it forked.** Advisory CI was the right call for speed, but PRs #33, #50, and #59 all note that "E2E snapshots will change", #60 changed the E2E selectors, and no baseline has been regenerated. The project's own rules require Docker-generated Linux baselines, so this is a known chunk of work before `v2` can merge into `main`.
- **One dead-code path remains** (the density-4 smooth rendering, with its display-resolution canvas backing and dev stand-in script). The Fredoka text layer is gone: UI1 removed its last user and the font files.
- **Nobody has listened to the music.**
- **The Game Boy view is untouched.** It was smoke-tested in the PRs that touched shared code, but it is not part of the redesign, so it will not have the new look.

## The numbers

All from git and the PR list at `e69c0c3`, unless stated. Time is local (UTC+2), 2026-09-29. Where a number changed since the first version of this post (written at `2d06f64`), the old value is in brackets.

| What                                                                        | Number                                                                                                                                                |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commits on `v2` since the v1 merge point (`f5c5897`)                        | 93, all under one author identity [82]                                                                                                                |
| ... of which plan/doc commits (`docs:` subject)                             | 42 (41 `docs:` and the first blog commit) [36]                                                                                                        |
| PRs merged into `v2`                                                        | 52 (#9 to #62, excluding two closed test PRs) [47]                                                                                                    |
| PRs per phase                                                               | 20 (foundations and fan-out), 14 (Phase R and integration), 18 (Phase H so far, including the blog's first PR) [20, 14, 13]                           |
| Distinct task cards behind them                                             | about 41 (T0.x, F1–F5, A1–A2, E1–E4, B1–B7, R0–R1, RA, RB1–RB7, I1–I2, H0–H1, H0b, HA, HL, T1–T3, UI1, BL, plus one unnumbered prompt fix) [about 38] |
| Files changed / lines added / lines removed                                 | 483 / 52,321 / 2,208 [442 / 33,734 / 1,788]                                                                                                           |
| ... in `src/`                                                               | 157 files, +30,434 / −2,167 (about 15,800 of the added lines are the T3 font atlases) [146 files, +12,995 / −1,765]                                   |
| ... in `scripts/` (asset tooling)                                           | 37 files, +12,812 [34 files, +12,377]                                                                                                                 |
| ... in `assets-src/` (prompts, palette, provenance, audio source; ex-audio) | 204 files, +3,494 [186 files, +3,150]                                                                                                                 |
| Unit tests                                                                  | 123 (F1) growing to 503 (UI1), plus 25 browser tests [420]                                                                                            |
| Provenance records                                                          | 91 (checked by `lint:assets`) [about 90]                                                                                                              |
| Audio files                                                                 | 29: 5 music, 4 ambience, 20 sound effects                                                                                                             |
| Rows in the Gate log                                                        | 19 (14 orchestrator, 5 Daniele) [15]                                                                                                                  |
| Image files in Codex's exchange folder (not in git)                         | 189 at the time of writing; 21 of its folders are Phase H, including the nine Zurich layer items [147]                                                |
| Wall-clock from first plan commit to last                                   | 12 hours 13 minutes [11 hours 40 minutes]                                                                                                             |
| First PR merged (#9) / twentieth (#30)                                      | 13:58 / 15:53 (unchanged)                                                                                                                             |

Two things to read carefully. First, the tooling (12,000+ lines of TypeScript that turns generated images into shippable assets, measures them, and validates them) was about as large as all the new code under `src/` in the first version of this post. It no longer is, but only because one PR added 15,800 lines of glyph grids: without them `src/` is at about 14,600, still close to the tooling. Second, "agents" cannot be counted from git: a task card is at least one agent run, but sessions restart, sub-agents get spawned inside sub-agents, and the Codex sessions leave nothing in history at all. Count the 41 task cards as a floor.

## Lessons

**1. Make the plan the API.** Owns lines, `After` lists, `Done when` checks, and a contract in code made most of the parallelism safe. When a task needed something outside its Owns line (`package.json` for a `tsc -b` fix, `knip.json`), the PR said so in one line. The rule "the code wins over the spec sketch" prevented a class of stale-doc bugs.

**2. Make lane boundaries physical.** The Codex lane writes to a gitignored folder and a `DONE` file. It cannot commit, so it cannot break anything. This is much stronger than "please only edit these files".

**3. Front-load the risky serial work, then fan out.** Anchors, a probe, all the prompts up front, and placeholders so the engine lane could start on day zero. The engine ran on box-figure placeholders for the first hour or so, before any real art existed, and then met the real art with the fixes listed above rather than a rewrite.

**4. Delegate objective gates, keep taste gates, and give every delegation an expiry.** The orchestrator's picks were well reasoned and mostly right about what it could measure. It could not see that the whole direction was wrong. The one gate that Daniele reinstated for himself (the HD anchors) defined the final look, and after he came back the rest of the Phase H picks followed. Two rules would have avoided the detour. Make the human taste checkpoint earlier and cheaper: one screenshot of the running game against the reference, at the first Phase 2 merge, would have been enough. And write a delegation as a time-boxed grant that names its end ("until Daniele is back, and the orchestrator asks when it is unsure"), because a plain "until he says otherwise" puts the burden of noticing on the one person who has no reason to check.

**5. Measure, don't argue.** OKLab contrast, layout offsets, loudness in LUFS, seam differences, and a "no text is wider than its panel" test replaced opinions with numbers. The 0.08 rule was written down after a bug, and then a tool was written that found the remaining bugs.

**6. Put the reference in the loop early.** The second correction came when Daniele put a screenshot of the actual reference next to the game, and a reference like that would probably have caught the first one too. It belongs in the plan from day one, in the same folder as the scale sheet. T3 shows the payoff of doing it: the font agent compared seven typefaces against the MI3 crop and hand-tuned individual glyphs, so its output was judged against the reference and not against the agent's reading of it. Whether it passes Daniele's eye is not yet on record.

**7. Don't delete what a human might send back.** T1 removed a pixel font, and the next review asked for a pixel font. T3 then had to build a new one from scratch. Prefer retiring behind a flag until the direction has survived a review. The inverse lesson is in the density-4 path: it was kept "merged and unused" and now sits in the tree as debt, so a flag needs a removal date too.

**8. One writer for the plan, and batch its changes.** Every plan commit invalidates every open branch. The rule "only Daniele changes the plan" (and, later, "the blog writer edits only `docs/blog/`") kept the truth in one place. Batching kept the rebase load down.

**9. Advisory CI is a loan.** It bought speed, and the interest is E2E baselines and any regression the E2E suite would have caught. Log the loan when you take it.

**10. Ask for a proposal before a build, when the design is subjective.** UI1's agent was told to weigh concepts first, and its PR opens with three (a painted strip, a travel kit, a verb coin), a choice, and the reason: the mapping is carried by the controls' structure, not by extra labels, and the verb coin fails one-click reach. It let a reviewer disagree with a paragraph instead of a set of pixels, and it put the rejected options on the record. The cost was one extra section in the PR. Whether the trunk is the right answer is Daniele's call, and no verdict from him is in git yet.

**11. Agents are excellent at exactness and poor at "does this feel right".** Palette-index text grids, OKLab remaps, keyhole walkboxes, and seam analysis are jobs where an agent that cannot see the image still gets it exactly right, provided you give it a text representation and a metric. For "is it Monkey Island 3", you need a person.

## What's next

State of play at `e69c0c3`: the game on `v2` is still the Phase R 2× pixel-art version underneath, playable end to end (Hall, three countries, travel map, 29 audio files, terminal routing), but its text and controls are now the Phase H versions: a bitmap serif on the art's grid (T3) and the travel-trunk control bar (UI1), with minimal in-world text (T2). Phase H's tooling and engine are done (`assets:prepare --painted`, `assets:rig`, effects, world scale, the rig renderer), the HD Zurich and character anchors are chosen, the Hall, London, Sorrento and travel-map candidates are picked, all four rooms have layer prompts, and Codex has generated the Zurich layers. The shared sprites (HB6) are the first painted HD art in the tree.

Still to do:

- **Daniele:** pick the character parts and mouth shapes (HC3), which Codex has generated. Under the new rule, the rig build (HB7) does not start until he does. G4, the final review, is still his.
- **Opus:** assemble each scene from its layers (HB1 to HB5) and rig Daniele (HB7). Zurich's layers are ready to assemble now.
- **Codex:** the layer batches for the Hall, London and Sorrento, whose prompts are written.
- **I3 and G4:** final cohesion, the contrast walk again, the OG image, regression checks, and Daniele's review before `v2` merges into `main`.
- **Debts:** E2E baselines in Docker (now with the changed selectors), removing the abandoned density-4 render path, the plan's stale status tables (blog and HC5-zurich) and delegation paragraph, and someone listening to the music.

This post is meant to be updated after every gate, direction change, and landed phase. If the next update is a fourth art direction, it will say so.

## Changelog

- **2026-09-29 (second update, 22:12):** Updated at `origin/v2` `e69c0c3`. Added the minimal-text rule and the text arc (T1's smooth Fredoka rejected, T3's MI3-style Libre Caslon bitmap serif built, with the rasteriser and the fitting order); the Phase H correction's tooling (H0b's joint palettes, hard alpha and `style: painted`); the HG1 outcome, the HC2 to HC4 fan-out, the Zurich layers, and the layer prompts for all four rooms (#61) and the first painted HD art to land, the shared sprites (#62); the UI1 travel-trunk redesign with its three concepts and a before/after; E4's rig, clips, effects, and moving props, with an honest line on the unused density-4 path; the reversal of the picks policy and what it says about stale delegated authority; the move of sub-agents to Sonnet 5.5 and the plan's requirement for this post. Refreshed the numbers (52 merged PRs, 93 commits, 503 unit tests) and the Lessons (a new one on proposals before builds, and a rewrite of the one on delegation). Three new images.
- **2026-09-29:** First version, written at `origin/v2` `2d06f64`. Covers foundations and fan-out (Phases 1 and 2), the 2× remaster (Phase R), the first half of Phase H (HD tooling, engine, anchors), and the operational lessons to date.
