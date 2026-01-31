# Daniele Tortora — Personal Portfolio

  <div align="center">
  <img src="src/assets/retro-daniele.png" alt="Pixel art portrait of Daniele" width="300" />

_A retro point-and-click adventure portfolio_

</div>

---

A personal website presented as an interactive point-and-click adventure, inspired by classic SCUMM games (e.g. Day of the Tentacle). Visitors explore a 2D scene, click hotspots, use a retro-style terminal, and open modals to read about skills, experience, contact, and more.

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

1. **Welcome screen** — Dismiss to enter the main scene.
2. **Scene** — Click on the background image; hotspots open content (About, Skills, Contact, Experience, CV/Resume). You can also click to move the character.
3. **Toolbar** — Bottom bar with quick actions that open the same content modals.
4. **Floating terminal** — Opens a retro terminal; type `help` for commands (e.g. `about`, `skills`, `contact`, `talk`, `resume`).
5. **Keyboard** — Shortcuts may be available (see the app or code for details).

Personal info and content are centralized in `src/config/profile.ts` and related config under `src/config/`.
