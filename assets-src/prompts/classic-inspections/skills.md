# Skills — London pub chalkboard

Use case: stylized-concept / style-transfer. Built-in imagegen concept for the Skills close-up in this 1990s point-and-click adventure portfolio.

## References

1. `src/assets/remaster/london/bg.png`: primary reference for the existing pub's architecture, warm palette, materials and crisp pixel grid.
2. `src/assets/remaster/inspections/experience.webp`: supporting reference for adventure-art texture, restrained palette and close-up scale.
3. `src/assets/remaster/inspections/about.webp`: supporting reference for playful adventure-game personality; do not import its Mediterranean palette or objects.

## Composition and art direction

Full-bleed 2:1 close-up of the pub chalkboard above the bar on a rainy London evening. Right 62%: a large nearly front-facing blue-black charcoal slate inside a chunky worn oak frame, integrated into oxblood wall panelling and lit by one small amber brass pendant lamp. Left 38%: three traditional polished brass hand-pull beer pumps with eccentric wooden handles, an amber pint and stacked cardboard beer mats. The pint sits beneath a comically overengineered brass drip catcher with a bent spout, steadied by a folded beer mat. A narrow rain-streaked window at the far left shows a small cool-blue St Paul's skyline. Dark bottle silhouettes flank the board; its ledge holds a chalk stub and a worn eraser.

Use the pub's oxblood red, tobacco-brown oak, aged brass, amber highlights, blue-black slate and cool rainy window blues. Crisp painted pixel art, stepped edges, broad hard shadows, limited tonal ramps and readable adventure-game silhouettes. Avoid smooth digital illustration, bloom, glossy 3D, heavy purple, saturated scarlet or an outdoor Westminster postcard. No desktop chrome or navigation bar.

## Approved blank-slate revision

The initial preview showed a sample Frontend category on the slate. The approved second image removes ALL lettering, headings, skill names and the divider line. Preserve the composition, framing, palette, lamp, frame, pumps, pint, mats, drip catcher, window, skyline, counter, bottles, chalk and eraser. The entire inner slate is blank blue-black charcoal with subtle low-contrast texture and faint erased traces only near the edges. No replacement lettering, symbols, logos or decorative lines. A large clean central area is reserved for dynamic HTML from `profile.ts`.

## Export and live reading

The approved full-resolution PNG is `assets-src/approved/location-inspections/skills.png`. Export to `src/assets/remaster/inspections/skills.webp` at 1280×640 using the nearest-neighbour, lossless WebP treatment in `scripts/assets/remaster-ui.ts`. The build handles delivery compression. Text-safe insets are x=47–92%, y=18–78%; warm ivory live text is set by the chalkboard reading surface. All professional content remains in `profile.ts`.
