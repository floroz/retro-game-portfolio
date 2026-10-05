# Lost & Found artwork

The airport's shop is now a staffed Lost & Found booth. The clerk checks a form,
lifts a stamp, stamps it, and looks back up. A traveller carrying a paper map
pulls a suitcase across the hall, waits eight seconds offscreen, and returns.
The booth, clerk, service bell and unclaimed trunk have independent hotspots;
all portfolio sections remain accessible from the travel trunk.

## Sources and preparation

Full-quality generated sources and frozen palettes are in
`assets-src/approved/lost-and-found/`. The generation prompts are in
`assets-src/prompts/hd/lost-and-found.json`; the three sprite provenance records
are under `assets-src/provenance/hall-*.json`.

Run `npx tsx scripts/assets/lost-and-found.ts` to reproduce the exports. The
script writes matching density-2 and density-4 assets and maps them to colours
sampled from the corresponding existing airport artwork. The live remaster
clerk has five registered 80 × 84 frames. Their holds are 1500, 600, 400, 700 and
2200 milliseconds, preserving the approved animation's 5.4-second routine.
The traveller has four foot-aligned 192 × 216 frames at 170 milliseconds each.

The booth is a separate 320 × 284 remaster sprite, with blank signage for live
text. Its paper form stays on the counter underneath the clerk. A registered
96 × 84 background patch removes the old unattended luggage desk; the rest of
the background is unchanged. The Hall and stone-floor preparation scripts also
apply these exports so regenerating them cannot restore the old shop or desk.

Reduced motion holds the clerk at rest and hides the roaming traveller. The
traveller is decoration and never captures gate clicks. Canvas asset discovery
automatically includes all three new sprites in the airport preload tier.

The retired souvenirs, inspection cards and generation sources were removed;
their history remains in Git. The shared inspection renderer continues to serve
the portfolio sections.

## Checks

Unit tests cover the variable frame holds, palette and size budgets, interaction
arrival points, and the traveller's offscreen intervals. Docker Playwright tests
cover clerk motion, reduced motion, keyboard interactions and gate access.
