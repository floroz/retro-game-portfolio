# Daytime Zürich chalet

Built with the built-in imagegen tool on 2026-10-05, following the user-approved fondue-room concept. Masters are retained in `assets-src/approved/swiss-room/`; the approved Experience album and revised upright Resume folio are in `assets-src/approved/location-inspections/`. Earlier office/chalet artwork is removed from the working tree; Git retains its history. Historical blog illustrations and existing test baselines are retained.

## Direction and generation inputs

The concept replaces the workstation and filing cabinet with a fondue bar, a travel album on a low table, and a document satchel hanging by the door. Sunny green foothills, snow-tipped Alps, blue Lake Zürich, honey pine, cream plaster, burgundy rug and curtains. The cow stays outdoors behind a garden fence. Match the existing London and Sorrento scene camera, character scale and relatively coarse painted pixel finish. No corporate-office furniture, miniature railway, ticket machine, landscape wall picture or indoor cow.

The concept was the reference for each room generation. Each separate sprite request specified transparent alpha, whole silhouettes, warm daylight, dark brown contours, coarse stepped edges and no surrounding shadows, haze, labels or UI. The first furniture sheet's alpha was refined with a second built-in background-removal pass. The master retains transparent RGB; the export clears invisible pixels before trimming.

- **Background:** exact 2:1 room plate, no toolbar, character, bar, stool, table, album, satchel, cow, fence, door leaf, boat, pendulum, cuckoo or steam. Reconstruct wall, floor and garden behind removed objects. Retain window, view, curtains, rug, shelf/crockery, clock casing and bare peg.
- **Furniture sheet:** bar with bread and cheese but no pot; table with mug but no album; stool; open travel album; closed satchel; open satchel. Keep both satchel bodies at the same scale and registration.
- **Props sheet:** open wooden door leaf; six-picket fence; fondue pot and burner with forks but no steam; small lake boat; cuckoo bird. The spare flame cell is not exported: its glow would be distracting at game size.
- **Cow sheet:** resting, blinking, chewing/ear movement, and a further resting pose, one row, fixed scale and chest anchor, head and upper chest only. The fourth pose changes the face too much and is not exported. The resting pose is held between short animation cycles.
- **Experience:** near-frontal open burgundy travel scrapbook, Sorrento/London/Swiss mementos and an old floppy disk on the left, quiet cream page on the right. No painted professional text. This is the user-approved close-up.
- **Resume:** one upright front-facing cream document in a burgundy folio, brass clip above the reading area, modest open satchel partly behind it at left, blue fountain pen, sparse timber/garden background. Avoid the rejected low, perspective-tilted writing surface and oversized bag. No painted professional text.

## Reproduction

Run `node --import tsx scripts/assets/swiss-room.ts`. Rectangles measured from the retained sheets are recorded in that recipe. It cuts and registers the sprites, clears/thresholds alpha, samples at two art pixels per logical pixel, then jointly derives one 256-colour palette for background, sprites, cow frames and both reading surfaces. It reserves the actual UI ink, cream, brass and country accent colours. There is no universal palette for the existing painted scenes; matching uses their colour families plus these shared anchors.

The density-4 remaster files enlarge the density-2 pixels with nearest-neighbour. They do not recover extra smooth detail. The original and remaster folders have matching assets. Full-quality source masters are retained; the normal build still handles delivery compression.

## Layer behaviour

The background is static. Bar/stool/table use independent floor baselines and walking exclusions. Album shares the table's depth and opens Experience. Satchel has resting/open states and opens Resume. Cow renders at depth 94, fence at 95, door at 96, all behind an indoor character. Cow animation is clipped to the doorway; the boat and water glints are clipped to the lake. Steam, glints and clock pendulum are existing procedural effects. Cuckoo is a periodic moving prop. Reduced motion freezes the cow and pendulum and suppresses the bird's appearance.

The doorway stays open, preserving the approved outdoor view and fixed sunlight. The door leaf remains an exit hotspot. No new closed-door pose is needed yet.

## Iteration status

Visual baselines are regenerated in Docker when preparing a PR. Preview captures go in the ignored `assets-src/review/` directory.
