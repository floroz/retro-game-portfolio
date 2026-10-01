# Daniele Tortora — Retro Game Portfolio

<div align="center">

<img src="src/assets/retro-daniele.png" alt="Windows 98 desktop environment with a retro point-and-click adventure game" width="220" />

### [danieletortora.com](https://www.danieletortora.com)

_A personal portfolio disguised as a 90s retro game._

</div>

---

## What is this?

This is not your typical developer portfolio. It's an interactive point-and-click adventure game inspired by LucasArts classics like _Monkey Island_, _Day of the Tentacle_, and _Grim Fandango_ — wrapped inside a fully functional **Windows 98 desktop environment**.

Visitors don't just read about my work — they explore it. Click hotspots, talk to a pixel-art character, open windows, use a retro MS-DOS terminal, and discover Easter eggs along the way.

## Desktop Experience

The full desktop experience emulates a Windows 98 environment:

- **Desktop icons** — Launch the adventure, My Computer, My Resume, MS-DOS Prompt, and Recycle Bin
- **Start menu and taskbar** — Launch applications and portfolio shortcuts, use Quick Launch and Show Desktop, toggle sound, and switch between running windows
- **Window management** — Minimize, maximize, close, and drag windows just like the real thing
- **Game window** — A point-and-click adventure scene where you explore hotspots for About, Skills, Contact, Experience, and Resume
- **Object inspections** — Illustrated postcards, a working kit, a career album, correspondence and a résumé folder reveal readable live portfolio text and links. Close an inspection to return to the same room and position.
- **Travel and discovery** — Toolbar sections open immediately; airport gates travel to London, an Alpine chalet and Sorrento. Four duty-free souvenirs have optional playful close-ups.
- **MS-DOS Terminal** — A retro terminal with commands like `help`, `about`, `skills`, `contact`, `talk`, and `resume`
- **Recycle Bin** — Contains humorous "deleted" files about software development
- **Loading screen** — A Windows 98 launch dialog with segmented progress when opening the remastered game
- **Keyboard shortcuts** — Navigate the experience without a mouse

## Mobile Experience

On mobile and portrait tablets, **Pocket Adventure** begins with an illustrated invitation recommending desktop for the full game. Enter the painted Sorrento kitchen or go straight to **Experience, Résumé or Contact**. In the kitchen, tap the postcards, telephone, career album, document folder, or backpack and laptop to discover the portfolio, or use the always-visible navigation.

The approved portrait of Daniele sits at the table, sipping coffee twice in each stage of a 30-second day, sunset, night and dawn cycle. Sun and moon move across the window; a ferry and wooden boat take turns crossing the sea, the moka steams, and the trees move in the breeze. Conversations are optional, object labels can be hidden, and scene motion can be paused. Sea ambience and occasional moka sounds are opt-in. Reduced motion starts with a still scene. Reading views use full-width, scrollable text from the same profile as desktop. Browser Back, direct section links, keyboard navigation, and reduced motion are supported. There is no boot delay or forced device rotation.

The first mobile chapter is Sorrento; travel to the desktop's other locations is a future expansion. See [the mobile design and artwork notes](docs/pocket-adventure.md).

---

## Built With

**Stack:**

- React 19 + TypeScript
- Vite (build & dev server)
- Framer Motion (animations)
- Zustand (global state)
- Lucide React (icons)

**AI & Creative Tools:**

This project was built with significant help from AI — not as a replacement for creativity, but as an amplifier. Tools used:

- **Claude Opus 4.6** (via OpenCode, GitHub Copilot, and VSCode) — code generation and architecture
- **GPT-4o image generation** (via ChatGPT) — visual assets and concept art
- **Nano Banana** — pixel art and artwork
- **Retro MIDI sounds** — sourced from the internet for authentic 90s audio

## Run Locally

Use the Node.js version in `.node-version` and the npm version in `package.json` (`packageManager`). Install them with your preferred version manager, then run:

```bash
npm ci
npm run dev
```

Then open the URL shown in the terminal (typically `http://localhost:5173`).

### V2.1 adventure remaster

The regular game now uses the approved remaster treatment in all four locations,
the travel map, dialogue, toolbar, title ticket and object inspections. Navigation,
hotspots, character proportions, timing and portfolio content are unchanged. The desktop uses a Windows 98 shell with silver bevels, gradient title bars, and a working Start menu. Mobile has its own Pocket Adventure chapter.

The source archive supplies 53 scene/map/shared exports at density 4 (1280×640
backgrounds), nine full-colour inspections, and the original-resolution title ticket.
Soft sprite edges and native canvas lettering preserve the original logical layout.
No new artwork was generated. Some source art has baked-in pixel texture; the tiny
limoncello sprite and code-drawn toolbar icons still retain their original detail.

Rebuild the exports with `npx tsx scripts/assets/remaster-hall.ts`,
`npx tsx scripts/assets/remaster-world.ts`, and `npx tsx scripts/assets/remaster-ui.ts`.
Source inventories and exceptions live in `assets-src/remaster/*-manifest.json`.
Original files remain available for reference. Open `/?remaster=hall` for the
synchronized V2/remaster comparison, including dialogue and walking controls.

### Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run build`   | Production build         |
| `npm run preview` | Preview production build |
| `npm run lint`    | Lint with ESLint         |
| `npm run format`  | Format with Prettier     |

---
