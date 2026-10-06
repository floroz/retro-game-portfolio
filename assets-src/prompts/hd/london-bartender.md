# London bartender and regulars' board

Generated with the built-in image tool on 6 October 2026, following the
user-reviewed London concepts in this chat. Sources live under
`assets-src/approved/london-pub/`; reproduce the exports with
`npx tsx scripts/assets/london-bartender.ts`.

## Bartender

Transparent twelve-pose sheet, four columns and three rows of equal square cells.
The bored London hipster has scruffy dark hair, a short beard, a faded charcoal
T-shirt and a small anchor forearm tattoo. Match the warm painted 1990s adventure
style of the approved concept. Only the waist-up man, brass beer tap, pint and
cream cloth: no scenery or counter. Fixed camera and scale, tap and glass bases
aligned on the same implied counter plane. Rest; reach for tap and empty glass;
pour a quarter pint; half pint; nearly full pint; close tap; set pint down; wipe
right, centre, left, centre, right. Hands touch their props. No juggling, fancy
clothes, airborne drinks, labels or backdrop. Keep real alpha transparency.

## Guest board

Transparent cutout of the approved regulars' corkboard and neighbouring trophy
shelf. Six distinct candid photographs: friends with pints, an older regular
with a dog, darts, a paper birthday crown, a laughing group and an enormous
pint. Overlapping tilted snapshots, colourful pins, yellow and pink Post-its
with unreadable scribbles. Tiny gold trophy on a short shelf, two curling beer
mats below. No room, lamps, dartboard or extra people. No readable names or text.

## Background

Edit the empty London pub background plate using the approved shelving concept
as a design reference. Replace the chalkboard and both neighbouring shelf towers
with aged dark wood backing, three central shelves, uneven clusters of amber,
olive and clear spirit bottles, pint glasses, pewter tankards, irregular side
cubbies and small trailing plants. No mirror, chalkboard, menu or readable text.
Preserve the room framing, window, skyline, red walls, pendant lamps, dartboard,
floor and rug. Keep the right wall clear for the separately layered photo board.
The plate must contain no people, bar counter, taps, furniture, photo board,
trophy shelf, door, jukebox or game interface. Output an opaque 2:1 room plate.
The original plate and approved preview are historical references in Git and the
chat; the current full-quality source is `london-pub/background.png`.

The preparation recipe scales each pose to 32×32 logical pixels (128×128
at density 4), matching the nearby patrons. Its bottom edge stays anchored at
y=90 so the hands, cloth and pint remain on the counter.

The preparation recipe packs pouring and wiping into separate eight-cell strips,
with complementary transparent holds to keep each strip within the scene-width
limit. Scene timings ensure that exactly one phase is visible at a time.
