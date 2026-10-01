# Location inspection artwork

The five portfolio cards share a bright cartoon adventure style and a 2:1
composition. Their text, links and pagination remain HTML from the shared profile.

| Section    | Location    | Illustration                                                                                   |
| ---------- | ----------- | ---------------------------------------------------------------------------------------------- |
| About      | Sorrento    | Daniele tries to close a suitcase containing a giant lemon, handheld console and hiking boots. |
| Contact    | Sorrento    | A rotary phone connects to tin cans on a tiled terrace above the Bay of Naples.                |
| Skills     | London      | A closed red telephone booth has its own umbrella and raincloud beside Westminster.            |
| Experience | Switzerland | A Swiss train carries luggage and a lounging cow up an Alpine viaduct.                         |
| Resume     | Switzerland | A ticket machine buries a station clerk in an endless paper ticket.                            |

## Sources and export

The built-in imagegen tool produced the full-resolution PNG sources in
`assets-src/approved/location-inspections/`. The exact prompts are in
`assets-src/prompts/location-inspections/`, their concept references in
`assets-src/references/location-inspections/`, and individual provenance records
are named `assets-src/provenance/remaster-inspection-*.json`.

Run `npx tsx scripts/assets/remaster-ui.ts` to export the approved sources as
lossless 1280×640 WebP files under `src/assets/remaster/inspections/`. The existing
build encoder handles delivery compression; the 512 KB per-image budget remains
unchanged. `src/config/inspections.ts` imports the art, which is already included
in desktop tier-four preload and the mobile cache warmer.

## Reading layout

Each card's `paperInsets` in `src/config/inspections.ts` defines a conservative
rectangle inside its blank surface. Insets are percentages of the complete
illustration, allowing the browser text fitter to preserve all content on resize.
Souvenir cards retain their original layout. Narrow desktop windows use the
existing stacked reading layout. Pocket Adventure retains its full-width text
pages without an artwork header, as established by the mobile spacing change.

The desktop visual tests show every portfolio illustration with live text.
The inspection flow tests traverse every page at 900px and 1440px, check content
overflow and text placement, verify image dimensions and contact/resume links,
and confirm Escape restores the original scene and focus. Component browser
tests additionally cover all cards at 680px, 900px and 1280px.

Regenerate and verify visual baselines only with the Docker E2E commands.
