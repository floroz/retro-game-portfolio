# Duty-free souvenir artwork

The airport's four optional souvenir close-ups use the same bright cartoon
adventure direction as the portfolio inspections. Each illustration combines an
airport terminal and parked jet with a visual joke about the souvenir's origin.
All titles, descriptions and controls remain live HTML.

| Souvenir                | Origin      | Illustration                                                                            |
| ----------------------- | ----------- | --------------------------------------------------------------------------------------- |
| Limoncello              | Sorrento    | An enormous lemon drains through a tiny funnel into a bottle on a majolica stand.       |
| Swiss Army knife        | Switzerland | A pocketknife unfolds an umbrella and an espresso holder alongside its familiar tools.  |
| Swiss cheese            | Switzerland | A cheese wheel doubles as rolling luggage, with a wedge in its own travel pouch.        |
| Telephone-box miniature | London      | A closed miniature booth brings its own raincloud, umbrella and puddle into a gift box. |

## Sources and export

Full-resolution generated PNGs live in `assets-src/approved/duty-free-inspections/`.
The exact prompts are in `assets-src/prompts/duty-free-inspections/`, and each
`assets-src/provenance/remaster-inspection-souvenir-*.json` record identifies the
portfolio illustration used as its style reference.

Run `npx tsx scripts/assets/remaster-ui.ts` to export lossless 1280×640 WebP source
files under `src/assets/remaster/inspections/`. The existing build encoder handles
delivery compression. The single-image 512 KB budget is unchanged. These files
replace the existing souvenir imports and remain in desktop preload tier four.

## Reading layout and checks

The blank purple-framed boards have no overlapping objects. `paperInsets` in
`src/config/souvenirs.ts` reserves conservative rectangles inside their pale
surfaces; the shared `ObjectInspection` type also supports the portfolio cards.
The existing text fitter, pagination, narrow-window stacked layout and return
controls apply to both kinds of inspection.

The inspection E2E tests open each souvenir from the airport, check the live copy
and reading boundaries, and capture Linux visual baselines. Regenerate these only
with the Docker E2E commands, and inspect the resulting screenshots for board
alignment, clipping and object overlap.
