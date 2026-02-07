# Mobile Experience Redesign: Retro PDA / Palm Pilot

## Overview

Replace the current CRT terminal mobile experience with a **90s Palm Pilot / PDA interface**. The entire mobile viewport becomes a pixel-art PDA device with tappable app icons, structured content views, and a persistent "visit on desktop" notification.

## Goals

1. **Hint to the user to go check on desktop** for the full interactive point-and-click adventure experience
2. **Quick access to core content**: About Me, Contact Details, Resume, Experience
3. **Delightful retro 90s aesthetic** that complements the desktop Win95/LucasArts adventure
4. **Touch-first mobile UX** — no typing required, all tappable

## Problem Statement

The current mobile experience is a CRT terminal that:

- Requires 3 screens before content (Welcome → BIOS → Terminal) — high drop-off risk
- Relies on typing commands — the worst input method on mobile
- Uses a fragile hidden input pattern that doesn't reliably trigger keyboards on iOS
- Renders content as monospaced text walls with no visual hierarchy
- Has no tappable links in contact output
- Has an unimplemented resume download (TODO stub)
- Has dialog text referencing desktop-only features ("open the terminal", "links in the toolbar")
- Hides the desktop overlay (MobileDesktop) behind a swipe gesture with no visual affordance

## Solution: Retro PDA Interface

### Why a PDA?

- **Fits the 90s era** perfectly — PDAs (Palm Pilot, 1996-97) were THE mobile computing device of the mid-90s
- **Inherently touch-first** — Palm Pilots were stylus/tap driven, no keyboard
- **Natural portfolio mapping** — PDAs had dedicated apps: Address Book (Contact), Memo Pad (About), Date Book (Experience), To Do (Skills)
- **Built-in desktop narrative** — "This is my pocket device. For the full OS experience, visit on desktop" makes the mobile limitation feel intentional and thematic

### Visual Design

```
┌─────────────────────────────┐
│         PalmPortfolio        │  ← PDA top bezel (brand name in pixel font)
│  ┌───────────────────────┐  │
│  │  ≡ 12:00 PM   🔋 🔊  │  │  ← Status bar (time, battery, sound)
│  ├───────────────────────┤  │
│  │                       │  │
│  │   [👤]     [💼]      │  │  ← App icon grid (2×3)
│  │   About   Experience  │  │
│  │                       │  │
│  │   [🔧]     [✉️]      │  │
│  │   Skills   Contact    │  │
│  │                       │  │
│  │   [📄]     [💬]      │  │
│  │   Resume    Talk      │  │
│  │                       │  │
│  │ ┌─────────────────┐   │  │  ← Notification banner (persistent)
│  │ │ 🖥️ Full OS avail│   │  │
│  │ │ on desktop! →   │   │  │
│  │ └─────────────────┘   │  │
│  └───────────────────────┘  │
│                             │
│    [🏠]   [◀]   [📋]      │  ← Hardware buttons (Home, Back, Menu)
│                             │
└─────────────────────────────┘
```

When tapping an app icon, the LCD area transitions to show that section's content in a scrollable card view, with a back button to return to home.

### LCD Screen Aesthetics

- Background: warm light green-gray (like a real LCD: `#c5cfa0`)
- Text: dark green/black (`#2c3a2e`)
- Subtle LCD pixel grid overlay (CSS repeating background pattern)
- **No scanlines** (that's CRT, not LCD)
- Font: "Press Start 2P" for headings (pixel-style), VT323 for body text

## Architecture

### New Files to Create

| File                                              | Description                                                    |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `src/components/mobile/PDA.tsx`                   | Main PDA shell container (bezel, LCD screen, hardware buttons) |
| `src/components/mobile/PDA.module.scss`           | PDA styling (bezel, LCD, buttons)                              |
| `src/components/mobile/PDAHomeScreen.tsx`         | Icon grid home screen                                          |
| `src/components/mobile/PDAHomeScreen.module.scss` | Home screen styling                                            |
| `src/components/mobile/PDAAppView.tsx`            | Generic content viewer for opened apps                         |
| `src/components/mobile/PDAAppView.module.scss`    | App view styling                                               |
| `src/components/mobile/PDAStatusBar.tsx`          | Top status bar (time, battery, sound)                          |
| `src/components/mobile/PDAStatusBar.module.scss`  | Status bar styling                                             |

### Files to Modify

| File                         | Changes                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| `src/App.tsx`                | Replace `MobileTerminal`/`MobileASCIIWelcome` imports with `PDA` |
| `src/styles/_variables.scss` | Add PDA-specific CSS custom properties                           |
| `src/store/gameStore.ts`     | Remove dead mobile-terminal state (`startMobileDialogSession`)   |
| `test/e2e-mobile.test.ts`    | Rewrite all mobile E2E tests for PDA                             |

### Files to Delete

| File                                                            | Reason                                   |
| --------------------------------------------------------------- | ---------------------------------------- |
| `src/components/mobile/MobileTerminal.tsx` + `.module.scss`     | Replaced by PDA                          |
| `src/components/mobile/MobileASCIIWelcome.tsx` + `.module.scss` | Replaced by PDA boot                     |
| `src/components/mobile/MobileDesktop.tsx` + `.module.scss`      | Replaced by PDA home screen              |
| `src/hooks/useMobileTerminal.ts`                                | Terminal-specific logic no longer needed |

### Files to Keep/Reuse (unchanged)

| File                         | Usage                                                       |
| ---------------------------- | ----------------------------------------------------------- |
| `src/config/profile.ts`      | Single source of truth for all content data                 |
| `src/config/dialogTrees.ts`  | Used by Talk app within PDA                                 |
| `src/config/commands.ts`     | Content generation functions still used by desktop terminal |
| `src/hooks/useIsMobile.ts`   | Mobile detection — no changes                               |
| `src/hooks/useTypewriter.ts` | Reused in Talk app for dialog messages                      |

## Component Design

### 1. PDA Shell (`PDA.tsx`)

- Full-viewport wrapper with bezel border (dark gray, rounded corners)
- "PalmPortfolio" brand text at top of bezel in pixel font
- LCD screen area in the center
- Three hardware buttons at bottom: Home, Back, Sound toggle
- Boot animation on first visit (1-2 seconds): PDA screen flickers on → logo → home screen
  - Only on first visit (sessionStorage persisted)
  - Single gate, not three like the current flow

### 2. Status Bar (`PDAStatusBar.tsx`)

- Simulated clock display (shows real time)
- Battery icon (decorative, always full)
- Sound toggle button (reuses `toggleSound` from gameStore)
- Styled as dark-green-on-light-green LCD elements

### 3. Home Screen (`PDAHomeScreen.tsx`)

- 2×3 grid of app icons
- Six apps: **About**, **Experience**, **Skills**, **Contact**, **Resume**, **Talk**
- Each icon: pixel-art square (CSS/SVG) + label underneath
- Below grid: persistent notification card with pixel-art desktop icon:
  > "Full interactive adventure available on desktop!"
- Tapping an icon calls `onAppOpen(appId)`

### 4. App Views (`PDAAppView.tsx`)

Generic scrollable content container with:

- Title bar at top (app name + back/close button)
- Scrollable content area
- Content is **structured HTML** with proper hierarchy (headings, lists, cards)

Per-app content:

| App            | Content                                                                      | Special Features                                      |
| -------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| **About**      | Bio from `PROFILE.bio`, split into paragraphs with headings                  | Fun facts callout box                                 |
| **Experience** | Timeline/card layout of work history from `PROFILE.workExperience` + summary | Company, role, period per card                        |
| **Skills**     | Grouped skill badges/tags from `PROFILE.skills` categories                   | Category headers, tag-style chips                     |
| **Contact**    | Email, LinkedIn, GitHub, Location from `PROFILE`                             | **Tappable links** (`mailto:`, URLs open in new tab)  |
| **Resume**     | Brief summary + download button                                              | Triggers actual PDF download from `PROFILE.resumeUrl` |
| **Talk**       | Dialog tree from `dialogTrees.ts` rendered as chat bubbles                   | Typewriter effect, tappable option buttons            |

### 5. Talk App (Chat-Bubble Dialog)

- Reuses `dialogTrees.ts` and `useTypewriter.ts`
- Messages appear as speech bubbles (Daniele's messages on the left)
- Options appear as tappable buttons below the latest message
- No text input needed — pure tap interaction
- Scrollable history of the conversation
- "Start new conversation" button when dialog ends

### 6. Boot Sequence

- Single animation: LCD flickers on → "PalmPortfolio v4.0" centered → dissolve to home screen
- Duration: ~1.5 seconds
- First visit only (check `sessionStorage`)
- On return visits: straight to home screen

## CSS Custom Properties

Added to `_variables.scss`:

```scss
/* PDA / Palm Pilot LCD colors */
--pda-lcd-bg: #c5cfa0; /* LCD background — warm green-gray */
--pda-lcd-text: #2c3a2e; /* LCD dark text */
--pda-lcd-text-dim: #5a6a5c; /* LCD secondary text */
--pda-lcd-accent: #3a5a3c; /* LCD accent/links */
--pda-lcd-highlight: #a8b888; /* LCD selection highlight */
--pda-bezel: #4a4a52; /* PDA shell color */
--pda-bezel-light: #6a6a72; /* PDA shell highlight */
--pda-bezel-dark: #2a2a32; /* PDA shell shadow */
--pda-button: #3a3a42; /* Hardware button color */
```

## State Management

PDA uses **local React state** (not Zustand) since it's fully self-contained:

```typescript
// Local state in PDA.tsx
const [currentApp, setCurrentApp] = useState<string | null>(null); // null = home screen
const [pdaBooted, setPdaBooted] = useState(
  () => sessionStorage.getItem("pdaBooted") === "true",
);
```

The only shared state from `gameStore` is:

- `soundEnabled` / `toggleSound` for the sound button
- `welcomeShown` / `dismissWelcome` for the boot animation gate
- `dialogNode` / `selectDialogOption` for the Talk app

### Cleanup from gameStore

Remove `startMobileDialogSession` (unused mobile-specific action).

## Content Strategy

**Each PDA app renders content directly from `PROFILE` config as structured JSX.** The existing `commands.ts` text-formatting functions remain unchanged for the desktop terminal. No shared formatting layer between mobile PDA and desktop terminal.

Example — About app reads `PROFILE.bio` and renders it with paragraphs and headings. Experience app reads `PROFILE.workExperience` and renders a card/timeline layout.

## Testing Plan

Rewrite `test/e2e-mobile.test.ts` to cover:

### Functional Tests

- [ ] PDA boot animation plays on first visit
- [ ] Boot animation skipped on return visits (sessionStorage)
- [ ] Home screen shows all 6 app icons
- [ ] Tapping each icon opens the correct app view
- [ ] Back button returns to home screen
- [ ] Hardware Home button returns from any app
- [ ] Contact section has tappable links (mailto, LinkedIn, GitHub)
- [ ] Resume triggers PDF download
- [ ] Talk app shows dialog messages with typewriter
- [ ] Talk app navigates dialog tree via tap on options
- [ ] Desktop notification is visible on home screen
- [ ] Sound toggle works

### Device Tests

- [ ] Orientation change handling
- [ ] Tablet viewport (iPad Pro 11)
- [ ] Small viewport (iPhone SE / 320px)

### Accessibility Tests

- [ ] Proper ARIA roles and labels
- [ ] Focus management between views
- [ ] Min 44px tap targets
- [ ] `prefers-reduced-motion` support (disable boot animation, disable LCD flicker)

### Visual Regression

- [ ] PDA home screen
- [ ] Each app view (About, Experience, Skills, Contact, Resume, Talk)
- [ ] Boot animation frame
- [ ] Tablet layout

## Implementation Order

1. Add PDA CSS custom properties to `_variables.scss`
2. Create `PDAStatusBar` component (simplest, no dependencies)
3. Create `PDAHomeScreen` component with icon grid
4. Create `PDAAppView` component (generic content viewer)
5. Create individual app content renderers (About, Experience, Skills, Contact, Resume)
6. Create `PDA` shell component (bezel, boot animation, screen area, hardware buttons)
7. Create Talk app using dialog tree + typewriter (chat-bubble style)
8. Update `App.tsx` to use PDA instead of MobileTerminal/MobileASCIIWelcome
9. Implement actual resume download (add PDF or link to `public/`)
10. Delete old mobile components (MobileTerminal, MobileASCIIWelcome, MobileDesktop, useMobileTerminal)
11. Clean up `gameStore.ts` (remove dead mobile state)
12. Rewrite mobile E2E tests
13. Run `npm run format` and `npm run lint`
14. Manual testing and visual polish

## Code Issues in Current Implementation (Reference)

These are resolved by the PDA redesign but documented for context:

1. **Hidden input pattern fragile on iOS** — PDA eliminates text input entirely
2. **Duplicate onClick/onTouchEnd handlers** — PDA uses standard click handlers only
3. **`exit` command calls `closeTerminal()` on mobile** — PDA doesn't have a terminal to close
4. **Resume command is a TODO stub** — PDA implements actual download
5. **Banner marked "DEPRECATED" in CSS but still rendered** — PDA replaces with notification card
6. **`orientationchange` event is deprecated** — Use `resize` event instead
7. **No tappable links in contact output** — PDA renders proper `<a>` tags
8. **Dialog text references desktop-only features** — Talk app is standalone, no terminal references
9. **3 gates before content** — PDA has 1 fast boot animation (skippable)
10. **No Resume icon in MobileDesktop overlay** — PDA home screen has all 6 apps
