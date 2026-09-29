# Expansion plan: multi-scene adventure

Turn the single painted scene into a small point-and-click world with one room per portfolio section. The core principles in `AGENTS.md` still apply. Above all, every section stays within one or two clicks. Assets are planned separately in [the art spec](art-spec.md).

## Where to work

All v2 work happens on the long-lived **`v2`** branch, the trunk and source of truth for this version. `main` stays on v1 until `v2` is ready, and only then is `v2` merged into `main`.

- Branch every task from `v2`, including each agent's worktree: `git worktree add ../<task-id> -b <branch> origin/v2`.
- Open each pull request against `v2`, never `main`.
- Before starting a task, run `git pull` on `v2` so it builds on everything merged so far.

## Today

- One scene: `background.png` (1372×714, AI-painted) scaled to 1280×640, with five hotspots positioned as percentages.
- The character has one static sprite and one moving sprite, depth scaling by Y position, and a fixed walkable area.
- Triggering a hotspot opens a content overlay (`TerminalScreen`) for that section.

## Decisions

- **Resolution:** art is authored at a native 320×160 with a fixed palette and scaled 4× with pixelated rendering. The logical viewport stays 1280×640, so the coordinate system, toolbar layout, and tests keep working. The low native resolution enforces real pixel art instead of painterly "retro" images.
- **Verb shortcuts:** the character walks to the nearest exit (limited by the existing `MAX_TRAVEL_TIME` of 1.5 seconds), the scene changes, and the section's content opens on arrival. A click during the sequence skips straight to the content. It still takes one click.
- **No map or scene-select screen** in the MVP. Rooms are reached through the toolbar, the terminal, and exits.

## MVP features

1. **Scene system:** a scene config with a background, layers, walkable area, depth scale, hotspots, exits, and an entry point for each scene. The store tracks `currentScene`. This replaces the single `SCENE_CONFIG`.
2. **Hub and rooms:** the hub (the current room, redrawn) plus About, Skills, Experience, Contact, and Resume rooms. Each room contains the objects that open its section's content.
3. **Exits and transitions:** doors and scene edges act as exits, with a period-style transition (a fade or iris) into the entry point of the next room.
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
- E2E tests for exit navigation, and for reaching each section in two clicks or fewer from any room.

## Out of scope for the MVP

Inventory, puzzles, a scene map, save state, and mobile scenes.
