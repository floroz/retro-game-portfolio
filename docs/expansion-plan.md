# Expansion plan: multi-scene adventure

Turn the single painted scene into a small point-and-click world: a Hall plus three scenes, each a tribute to a country Daniele has lived in. The core principles in `AGENTS.md` still apply. Above all, every section stays within one or two clicks. Assets are planned separately in [the art spec](art-spec.md).

## Where to work

**`v2` is the trunk.** All v2 work happens on the long-lived `v2` branch, the source of truth for this version. `main` stays on v1 until `v2` is ready, and only then is `v2` merged into `main`.

Every agent works in its own git worktree, so parallel work never collides. Work only comes back together through pull requests into `v2`:

| Worktree                                | Branch                                                     | Who                                               | Commits?                                                       |
| --------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| `retro-game-portfolio/` (main checkout) | `v2`                                                       | Daniele only: reviewing, merging, updating Status | Daniele only                                                   |
| `../rgp-codex/`                         | Detached at `origin/v2`                                    | The Codex orchestrator and its sessions           | Never: it writes only to the gitignored `assets-src/exchange/` |
| `../rgp-opus/`                          | Detached at `origin/v2`                                    | The Opus orchestrator, for coordinating           | Never                                                          |
| `../rgp-<task-id>/`                     | `assets/<task-id>` or `engine/<task-id>`, from `origin/v2` | One Opus agent per task                           | Yes: one PR per task, against `v2`                             |

- **Create a task worktree** with `git fetch origin && git worktree add ../rgp-<task-id> -b <branch> origin/v2`.
- **Refresh an orchestrator worktree** after merges with `git fetch origin && git checkout --detach origin/v2`. A branch can be checked out in only one worktree, so orchestrators never check out `v2` itself.
- **Open every pull request against `v2`, never `main`.** Daniele merges.
- **Reconciling:** each task writes only the paths in its **Owns** line, so PRs don't overlap. If a PR conflicts anyway, its agent rebases onto `origin/v2`, re-runs `npm run lint`, and pushes again. Only the final integration task may touch every scene.
- **Cleaning up:** remove a task's worktree once its PR is merged, with `git worktree remove ../rgp-<task-id>`.

### Keeping the plan in sync

The plan (this file and [the art spec](art-spec.md)) exists only on **`origin/v2`**. A copy in a worktree, a branch, or a chat is never the source of truth.

1. **Only Daniele changes the plan, and directly on `v2`.** Plan changes are small `docs:` commits pushed to `v2`, batched where possible, and never bundled into a task PR. An agent that thinks the plan is wrong proposes the change through its orchestrator, and keeps following the plan as written until the change lands.
2. **Agents read the plan from `origin/v2`**, not from their own branch, at the start of every task, before every gate, and before opening a PR: `git fetch origin && git show origin/v2:docs/art-spec.md` (and the same for this file). A branch created days ago still follows today's plan.
3. **When the plan changes mid-task,** the agent reads the diff (`git diff <sha it started from> origin/v2 -- docs/`), rebases onto `origin/v2` if the change affects its task, and says so in its PR.
4. **Every PR states the plan it followed:** "Plan read at `<sha>`", the `origin/v2` commit it last read the plan from.
5. **Orchestrators refresh before every spawn.** Before starting any task or session, an orchestrator fetches `origin` and refreshes its worktree if `docs/` changed.
6. **CI enforces it** (task T0.3 in the art spec). A pull request to `v2` fails if it edits `docs/` from a task branch, or if `v2` has doc commits the branch doesn't include yet. Every open PR must rebase after a plan change before it can merge.

## Creative direction

This section is the source of truth for what the world is and what it contains. Settle it before writing implementation steps or updating [the art spec](art-spec.md). Each item is marked:

- **Agreed:** decided with Daniele. Don't change it without asking.
- **Proposed:** a default that hasn't been confirmed yet.
- **Open:** needs a decision. None are open right now; see the [decision log](#decision-log).

When a style question can't be settled on paper, answer it with the throwaway prototype (`?prototype=scene`, dev only) rather than with production code.

### Concept (Agreed)

The portfolio is Daniele's journey through the three countries he has lived and worked in: **London, Switzerland, and Italy**. Each scene is a tribute to one country. The revamp lands while Daniele is moving from Switzerland to Italy, so no single country dominates, and Italy stands for "now and next".

The visitor starts in a **Hall**, a 1990s airport terminal. Daniele greets them there, and from the Hall they can fly to any scene or jump straight to any section's content.

### Structure

| Scene           | Tribute               | Setting                                                                                      | Sections           | Status |
| --------------- | --------------------- | -------------------------------------------------------------------------------------------- | ------------------ | ------ |
| **Hall**        | All three             | A 1990s airport terminal                                                                     | Jumps to all       | Agreed |
| **London**      | The City              | A pub on a rainy evening, with the City skyline through the window                           | Skills             | Agreed |
| **Switzerland** | Zurich: lake and Alps | The night office from prototype B in Zurich, overlooking Lake Zurich with the Alps behind it | Experience, Resume | Agreed |
| **Italy**       | Gulf of Naples        | A kitchen in Sorrento looking across the gulf to Naples, Vesuvius, and Ischia                | About, Contact     | Agreed |

### Look and feel

- **Depth (Agreed):** every scene has free-standing objects the character can walk in front of and behind, drawn in order of where they stand on the floor. The foreground layer is only for things that are always nearest the viewer. This is prototype B's mood with prototype C's depth.
- **One palette and time of day per scene (Agreed).** One shared master palette, extended with extra colour ramps per country. The journey reads from grey to cool to warm. The character, UI, and pixel rules are the same everywhere.
  - **London:** rainy evening. Wet greys and blues outside; amber light and dark wood inside.
  - **Switzerland:** clear night. Plum and navy, moonlit snow, a warm desk lamp.
  - **Italy:** late afternoon turning to sunset. Terracotta, lemon yellow, blue majolica tiles, Mediterranean sea.
  - **Hall:** neutral daylight through big terminal windows, so it sits comfortably next to all three.
- **Humour (Agreed):** props are chosen to invite a "look at" joke in the LucasArts voice.
- **Characters (Agreed):** Daniele is the only character, in one outfit in every scene, so one set of animation frames serves everywhere. No other characters in the MVP.

### The Hall: a 1990s airport terminal (Agreed)

**Requirements (Agreed):** it's the entry point, Daniele greets the visitor there, it has a way to visit each scene, and it has a way to jump straight to each section's content.

**Why an airport:** it's true to the story, since Daniele really flew between these places. Styled firmly in the 1990s (patterned carpet, beige plastic, CRT flight monitors, a split-flap board), it fits the period. A modern glass terminal would not.

- **Fly to a scene:** three gates, one per country. Daniele walks to the gate desk, and the travel map plays.
- **Jump to a section:** a duty-free shop with one product per section on its shelves, for example "Eau de Résumé" or "Aged Experience, since 2016". It opens the content without the trip.
- **Flavour (Agreed):** a split-flap departures board, the security arch ("please remove your laptop and your technical debt"), a luggage carousel, a lost-luggage desk, rows of seats, and planes taking off outside the windows.
- **Text on signs:** gate signs and the departures board are drawn by the engine in the pixel font, never painted into the art (see [Extensibility](#extensibility-agreed)).

### How visitors know where each section is (Agreed)

Each country owns named sections, and every step of the journey repeats that pairing, so no visitor has to remember it:

| Section            | Country and scene     | Primary object      | Why it belongs there                               |
| ------------------ | --------------------- | ------------------- | -------------------------------------------------- |
| Skills             | London: the pub       | Chalkboard menu     | Where the career started and the craft was learned |
| Experience, Resume | Zurich: the office    | CRT, filing cabinet | Where the career grew                              |
| About, Contact     | Sorrento: the kitchen | Fridge, wall phone  | Who Daniele is now, and where to find him next     |

1. **Gate signs** name the country and its sections, for example "Gate 1 · London · Skills", with the same icons the toolbar uses. Hovering shows "Fly to London: Skills".
2. **The travel map** labels the destination with its sections.
3. **On arrival,** Daniele names the section and its object, for example "London, where I learned the trade. The skills are on the chalkboard."
4. **In the scene,** the primary object is the most prominent thing in the room, and hovering it names the section ("Open Skills: chalkboard menu").
5. **The toolbar and the duty-free shop** list sections, not countries, so the mapping is never required knowledge.

### Moving between scenes (Agreed)

- **Hall to country:** from the gate, a travel-map transition, as in _Indiana Jones and the Fate of Atlantis_. A sepia map of Europe appears, and a small plane flies a red line from where the visitor is to where they're going, in about 1.5 seconds. A click skips it.
- **Inside a scene:** no transition, since each scene is a single screen.
- **Toolbar shortcuts:** they still reach any section in one click. The map counts as the shortcut's transition, and a click skips it.
- **Country to country:** only through the Hall. Every trip goes back through the airport, which keeps it at the centre.

### Scene contents (Agreed)

The **primary object** opens the section's content and is the target of the toolbar shortcut. The other objects are "look at" flavour. In London, each tap also has its own hotspot, naming its skill group with a "look at" joke, and the fruit machine and dartboard stay.

| Scene       | Primary objects                                                                                                                                                                                                                 | Flavour                                                                                                                                                                                                                  | Free-standing (depth)            | Animated                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------ |
| London      | **Skills:** the chalkboard menu behind the bar, with its text drawn by the engine, next to a row of taps, one per skill group (a slot row)                                                                                      | Photos of the London jobs (a slot row), dartboard, a fruit machine (a nod to v1's vending machine), and through the window the skyline (St Paul's, the Gherkin, the Shard), a red phone box, and a passing double-decker | Bar counter, tables, stools      | Rain on the window, the passing bus                    |
| Switzerland | **Experience:** the CRT workstation. **Resume:** the filing cabinet                                                                                                                                                             | A photo wall with one frame per Zurich job (a slot row), a cuckoo clock, and Lake Zurich and the Alps through the window                                                                                                 | Desk, chair, filing cabinet      | Stars, moonlight on the lake, the cuckoo               |
| Italy       | **About:** the fridge door, covered in photos and postcards, with one magnet per Italian job (a slot row, empty today). **Contact:** the wall phone with a curly cord, beside a table set with two espresso cups ("let's talk") | Moka pot on the stove, lemons and a bottle of limoncello, majolica tile floor, and through the window Naples, Vesuvius, Ischia, and a passing ferry                                                                      | Kitchen table and chairs         | Steam from the moka pot, sparkle on the sea, the ferry |
| Hall        | **Gates:** one per country (exits). **Duty-free shop:** one product per section (direct jumps)                                                                                                                                  | Departures board, security arch, luggage carousel, lost-luggage desk, planes outside the windows                                                                                                                         | Rows of seats, the security arch | Planes taking off, flipping departures board           |

**Where each job lives (Agreed).** The full Experience content always opens from the Swiss office, and mementos sit in the scene of the country where the job was held, set by each job's `country` field in `profile.ts`:

- **London:** Tray.ai and every role from 2016 to 2020. For example, framed photos or a staff noticeboard above the bar. This is where the career started.
- **Switzerland (Zurich):** Snyk, Frontiers, Meta, and Tundra, as the office's framed photos.
- **Italy:** no past jobs yet. It's the next chapter, which is why Contact lives there. The first Italian job appears as a fridge magnet with no art change.

### Extensibility (Agreed)

Skills and jobs will change, so **the art provides containers and `profile.ts` fills them.** Nothing that changes over time is painted into the art. Adding a skill or a job is a data change only.

1. **Content is data.** Primary objects only open the content screens, which read `profile.ts`.
2. **Collections are slot rows.** Where a scene shows one item per skill group or per job, the art supplies one generic sprite, and the scene data defines a row of slots. The engine fills one slot per entry in `profile.ts`.

   | Slot row          | Scene    | Generic sprite | Filled from         | Capacity (Proposed) |
   | ----------------- | -------- | -------------- | ------------------- | ------------------- |
   | Taps on the bar   | London   | Tap            | Skill groups        | 8                   |
   | London job photos | London   | Photo frame    | Jobs in London      | 6                   |
   | Zurich job photos | Zurich   | Photo frame    | Jobs in Switzerland | 6                   |
   | Fridge magnets    | Sorrento | Magnet         | Jobs in Italy       | 6                   |

3. **Each job records its country** (`london`, `switzerland`, or `italy`) in `profile.ts`, and that decides which scene shows its memento.
4. **Full rows fold, oldest first.** When a row is full, the oldest entries fold into one "and more" object, such as a shoebox of old badges, like the existing "Past roles" entry.
5. **No text in the art.** Signs, the chalkboard, the departures board, and all labels are drawn by the engine in the pixel font, so renaming a job or a skill never touches an image.
6. **CI catches overflow.** A unit test checks that every job has a country and that no row exceeds its capacity without folding.

**What still needs new art:** a new country (a whole new scene), a larger capacity for a row, or a custom memento for one specific job.

### Asset inventory (Agreed)

[The art spec](art-spec.md) turns this list into scene cards, palette ramps, audio, and an execution plan for the Opus and Codex orchestrators. The MVP includes all of the roughly 13 small animation loops.

**Artwork**

| Asset                    | Hall                                                                                        | London           | Switzerland | Italy  | Notes                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------- | ---------------- | ----------- | ------ | ------------------------------------------------------------------------- |
| Background (`bg`)        | 1                                                                                           | 1                | 1           | 1      | Includes the view through the window                                      |
| Foreground (`fg`)        | 0–1                                                                                         | 1                | 1           | 1      | Only for things that are always nearest the viewer                        |
| Free-standing objects    | 1–2                                                                                         | 3–4              | 3           | 2–3    | Each a separate sprite with a baseline                                    |
| Wall and hotspot objects | 2–3                                                                                         | 3–4              | 3–4         | 3–4    | Separate only if animated, stateful, or occluding; otherwise part of `bg` |
| Generic slot sprites     | —                                                                                           | Tap, photo frame | Photo frame | Magnet | One sprite each, repeated by the engine (see Extensibility)               |
| Animations               | 1                                                                                           | 2                | 3           | 3      | Small loops: rain, bus, stars, cuckoo, steam, sea, ferry                  |
| Exits                    | 3                                                                                           | 1                | 1           | 1      | Plus an `@open` state for any door                                        |
| Readable text            | None in the art. The engine draws all signs and labels in the pixel font                    |
| Travel map               | 1 map background, a route line, a small plane, and 3 location markers, shared by all scenes |
| Character                | Unchanged from the art spec: 37 body frames and 6 talk heads                                |

**Audio**

| Asset         | Hall                                | London                                 | Switzerland                          | Italy                                    |
| ------------- | ----------------------------------- | -------------------------------------- | ------------------------------------ | ---------------------------------------- |
| Music         | A new theme; `theme.mp3` is retired | Pub feel: honky-tonk piano, music-hall | Quiet night: music box, soft strings | Neapolitan: mandolin, a light tarantella |
| Ambience loop | Terminal hum and boarding chimes    | Rain and pub murmur                    | Clock ticking, a quiet night         | Waves, seagulls, a distant scooter       |

All four tracks share one motif, varied per country in the iMUSE style. Shared sound effects: footsteps on wood, tile, and carpet; door open and close; a travel-map sting; a UI blip. Optional object sounds: dart thunk, cuckoo, phone ring, moka gurgle.

### Decision log

Every creative decision has been settled with Daniele:

| #   | Decision                 | Outcome                                                              |
| --- | ------------------------ | -------------------------------------------------------------------- |
| 1   | Hall style               | A 1990s airport terminal                                             |
| 2   | London setting           | A pub                                                                |
| 3   | Section mapping          | London: Skills. Zurich: Experience, Resume. Sorrento: About, Contact |
| 4   | Where each job lives     | By its `country` field: London, Zurich, or Sorrento                  |
| 5   | Country-to-country exits | Through the Hall only                                                |
| 6   | Palette strategy         | One master palette with extra ramps per country                      |
| 7   | Hall music               | A new theme sharing one motif with the country tracks                |
| 8   | Other characters         | None in the MVP                                                      |
| 9   | Animation budget         | About 13 small loops                                                 |
| 10  | Character outfit         | One outfit everywhere                                                |
| 11  | Flavour props            | Keep the fruit machine and dartboard; a hotspot per tap              |
| 12  | Readable text            | Drawn by the engine in the pixel font, never painted into art        |

## Today

- One scene: `background.png` (1372×714, AI-painted) scaled to 1280×640, with five hotspots positioned as percentages.
- The character has one static sprite and one moving sprite, depth scaling by Y position, and a fixed walkable area.
- Triggering a hotspot opens a content overlay (`TerminalScreen`) for that section.

## Decisions

- **Resolution:** art is authored at a native 320×160 with a fixed palette and scaled 4× with pixelated rendering. The logical viewport stays 1280×640, so the coordinate system, toolbar layout, and tests keep working. The low native resolution enforces real pixel art instead of painterly "retro" images.
- **Verb shortcuts:** the character walks to the nearest exit (limited by the existing `MAX_TRAVEL_TIME` of 1.5 seconds), the scene changes, and the section's content opens on arrival. A click during the sequence skips straight to the content. It still takes one click.
- **No separate map screen** in the MVP. The Hall is the in-world way to choose a scene, and the travel map is only a transition. Scenes are reached through the Hall, the toolbar, the terminal, and exits.

## MVP features

1. **Scene system:** a scene config with a background, layers, walkable area, depth scale, hotspots, exits, an entry point for each scene, and slot rows filled from `profile.ts` (see [Extensibility](#extensibility-agreed)). The store tracks `currentScene`. This replaces the single `SCENE_CONFIG`.
2. **Hall and scenes:** the Hall plus the London, Switzerland, and Italy scenes described in [Creative direction](#creative-direction). Each scene contains the objects that open its sections' content.
3. **Exits and transitions:** doors and scene edges act as exits, with a period-style transition into the entry point of the next scene: the travel map between the Hall and each country (see [Moving between scenes](#moving-between-scenes-agreed)).
4. **Layered rendering:** background, object sprites, and a foreground occlusion layer that the character can walk behind.
5. **Character animation:** walk cycles in four directions, idle and talk frames, and the character turning to face the object being used.
6. **Guide dialogue:** each room has an entry line, and every object gets a "look at" description in the LucasArts voice.
7. **Routing:** toolbar verbs and terminal commands move the visitor to the target room using the verb-shortcut flow above.
8. **Audio:** an ambient MIDI track for each room, plus sound effects for doors and footsteps. The existing sound toggle controls all of it.
9. **Asset pipeline:** a written art spec (native size, palette, sprite grid, naming) so AI-generated assets stay consistent, plus preloading of adjacent scenes so transitions never flash. All asset work (art rules, tooling, prompts, and staged tasks for agents) lives in [the art spec](art-spec.md). Its scene data contract and character sheet format are the interface between the engine work (items 1–8) and the assets.

## Unchanged, but check after each change

- Game Boy mobile view, SEO and noscript HTML, and `profile.ts` as the single source of content.
- Win95 desktop shell, terminal, and Recycle Bin.

## Testing

- A visual regression baseline for each scene.
- A unit test that every job has a country and every slot row fits its capacity.
- E2E tests for exit navigation, and for reaching each section in two clicks or fewer from any room.

## Out of scope for the MVP

Inventory, puzzles, a navigable world map (the travel map is only a transition), save state, and mobile scenes.

<!-- T0.3 guard test, never merge -->
