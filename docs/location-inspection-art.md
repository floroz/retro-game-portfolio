# Location inspection artwork

The five portfolio cards use a 2:1 composition with painted materials, hard
shadow shapes and stepped raster edges inspired by 1990s point-and-click
adventures. Skills and Experience provide the painted pixel style references
for the Sorrento cards: warmer amber light, restrained colour ramps and tactile
wood, fabric and paper replace the earlier glossy cartoon rendering. About
preserves the suitcase joke and Daniele's facial proportions. Their text, links
and pagination remain HTML from the shared profile.

| Section    | Location    | Illustration                                                                                     |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------ |
| About      | Sorrento    | Daniele tries to close a suitcase containing a giant lemon, handheld console and hiking boots.   |
| Contact    | Sorrento    | An olive-grey rotary phone, espresso and envelopes sit beside a cream folio on a walnut desk.    |
| Skills     | London      | An oak-framed chalkboard sits above brass beer pumps and an amber pint in the warm London pub.   |
| Experience | Switzerland | A burgundy travel album holds mementos from Sorrento, London and Zürich beside its reading page. |
| Resume     | Switzerland | A leather satchel supports an upright cream document folio with a brass clip.                    |

## Sources and export

The built-in imagegen tool produced the full-resolution PNG sources in
`assets-src/approved/location-inspections/`. The current Sorrento and London prompts are in
`assets-src/prompts/classic-inspections/`; Zürich uses
`assets-src/prompts/swiss-room.md`, and individual provenance records
are named `assets-src/provenance/remaster-inspection-*.json`. Superseded
illustrations, concept sheets and generation references are kept in Git history,
not as duplicate images in the current tree. Provenance notes identify their
historical revision when needed. The Contact correspondence desk and About
suitcase were adapted using Skills and Experience as rendering references on
2026-10-07; their full-resolution sources retain the generated painted pixels.

Run `npx tsx scripts/assets/remaster-ui.ts` to export the approved sources as
lossless 1280×640 WebP files under `src/assets/remaster/inspections/`, using
nearest-neighbour resizing to preserve the stepped contours. The existing
build encoder handles delivery compression; the 512 KB per-image budget remains
unchanged. `src/config/inspections.ts` imports the art, which is already included
in desktop tier-four preload and the mobile cache warmer.

## Reading layout

The Skills slate is completely blank in the artwork. Its `readingSurface: "chalkboard"` sets warm ivory live lettering and a dark reading background in compact windows. Skill groups and lists continue to come from `profile.ts`.

Each card's `paperInsets` in `src/config/inspections.ts` defines a conservative
rectangle inside its blank surface. Insets are percentages of the complete
illustration, allowing the browser text fitter to preserve all content on resize.
Narrow desktop windows use the
existing stacked reading layout. Pocket Adventure retains its full-width text
pages without an artwork header, as established by the mobile spacing change.

The desktop visual tests show every portfolio illustration with live text.
The inspection flow tests traverse every page at 900px and 1440px, check content
overflow and text placement, verify image dimensions and contact/resume links,
and confirm Escape restores the original scene and focus. Component browser
tests additionally cover all cards at 680px, 900px and 1280px.

Regenerate and verify visual baselines only with the Docker E2E commands.

The daytime Zürich album and folio use the room’s shared 256-colour palette and density-2 painted pixel grid, enlarged to 1280×640 without smoothing. Their source art remains in `assets-src/approved/location-inspections/`. The dedicated `scripts/assets/swiss-room.ts` recipe owns these two exports; both general remaster scripts invoke it last. See `assets-src/prompts/swiss-room.md` for the current layer and art direction.
