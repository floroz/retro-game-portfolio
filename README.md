# Daniele Tortora — Retro Game Personal Portfolio

  <div align="center">
  <img src="src/assets/retro-daniele.png" alt="Pixel art portrait of Daniele" width="300" />

_A retro point-and-click adventure portfolio with Windows 95 emulation_

</div>

---

A personal website presented as an interactive point-and-click adventure, inspired by classic SCUMM games (e.g. Day of the Tentacle). The experience features a fully functional Windows 95 desktop environment with windowed applications, including a game window, MS-DOS terminal, and recycle bin. Visitors explore a 2D scene, click hotspots, use a retro-style terminal, and open windows to read about skills, experience, contact, and more.

## Stack

- **React 19** + **TypeScript**
- **Vite** (build & dev server)
- **Framer Motion** (animations)
- **Zustand** (global state)
- **Lucide React** (icons)

Node.js is managed via **fnm**; the project expects the version in `.nvmrc`.

## Run locally

```bash
fnm use
npm install
npm run dev
```

Then open the URL shown in the terminal (typically `http://localhost:5173`).

### Other scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run build`   | Production build         |
| `npm run preview` | Preview production build |
| `npm run lint`    | Lint with ESLint         |
| `npm run format`  | Format with Prettier     |

## How to interact

1. **Windows 95 Desktop** — The entire experience runs inside a Windows 95-style desktop environment with:
   - **Desktop icons** — Double-click to launch applications (Game, MS-DOS Prompt, Recycle Bin)
   - **Taskbar** — Shows running applications and system clock
   - **Window management** — Minimize, maximize, close, and drag windows
   - **Loading screen** — Authentic Windows 95 loading experience when opening the game
2. **Welcome screen** — Dismiss to enter the main game scene.
3. **Game window** — Contains the point-and-click adventure:
   - Click on the background image; hotspots open content (About, Skills, Contact, Experience, CV/Resume)
   - Click to move the character around the scene
   - Use the toolbar at the bottom for quick actions
4. **MS-DOS Terminal** — Opens a retro terminal window; type `help` for commands (e.g. `about`, `skills`, `contact`, `talk`, `resume`).
5. **Recycle Bin** — Contains humorous "deleted" files related to software development.
6. **Keyboard shortcuts** — Available throughout the experience (see the app or code for details).
