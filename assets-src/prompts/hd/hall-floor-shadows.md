# Airport floor and separate duty-free artwork

Generated with the built-in image generation tool on 2026-09-30. The original
plate is preserved at `assets-src/refs/hd/hall-before-stone.png`.

## Floor edit

Use case: precise-object-edit. Edit target: attached airport empty background plate. Replace ONLY the turquoise carpet with purple triangles with a tasteful 1990s airport terminal floor: muted warm grey limestone/terrazzo large rectangular tiles, sparse subtle thin grout lines in correct receding perspective, restrained fine pixel grain, low contrast, matte/satin finish. Floor should suit the warm ochre architecture and blue daylight. Keep crisp hand-painted pixel art matching original density; no modern photorealism. Preserve exactly the 2:1 composition, camera, wall-floor boundary, all walls, shop, products, signs (blank), monitors, doors, windows, airplane, suitcases and architecture in the same positions and sizes. Do not add furniture or people or text. Add subtle grounded contact/cast shadows only at bases of existing fixed fixtures: duty-free shop, luggage counter, gate podiums. Illumination from upper-left, shadows gently extend right/front. Open floor must remain uncluttered for separately rendered characters and seats. Output full background plate 2:1 landscape.

## Empty plate edit

Use case precise-object-edit. Edit target: airport background plate with stone tile floor. Remove ONLY the entire duty-free shop fixture at far left: crimson awning, shelves, products, black interior, golden side posts and bottom counter. Fill behind it with an empty plain ochre airport wall matching adjacent wall panels, with skirting along y about 54% height, and continue the existing stone terrazzo tiled floor under its former footprint. KEEP the dark departures board hanging above the shop at upper left, exactly as is. Preserve all rest of image: exact 2:1 framing, upper-left departures board, entire window/airplane/monitors, luggage counter, three gate doors, blank black signs, lighting, tiled floor. No added objects or text, no people. This must be an empty background plate: the removed shop will be a separate sprite. Crisp hand-painted 1990s adventure game pixel art, same style and composition.

Saved raw: `assets-src/approved/hall-stone-floor.png`.

## Transparent shop extraction

Use case background-extraction. Extract ONLY the entire DUTY FREE shop fixture from the far left of this airport reference as one game sprite on genuine transparent background. Include its crimson/red blank awning, ochre side posts, dark black shelf recesses, oak shelf boards, all existing small products in their exact arrangement (perfume, blue snow globe, postcards, boxed whisky, red toolbox, bottom display), ochre lower counter and bottom plinth. Do NOT include the hanging departures board above it, airport wall, window, floor, shadows on the floor, airplane or any other furniture. Preserve the original front-on view, rectangular proportions and original pixel art design/colours as closely as possible. Shop is clipped at the left image edge; keep a flat left vertical edge. No new lettering: awning stays blank for runtime text. Single isolated shop fixture, tightly framed with small transparent margin, approximately 160 wide to 142 tall aspect ratio. Transparent behind and around fixture but keep dark black backing within the shelves opaque. Do not redesign the shop.

The transparent shop source was retired when Lost & Found replaced it on
2026-10-05; the original remains in Git history.

## Preparation

Run `node --import tsx scripts/assets/airport-floor.ts`. This resizes the plate to
640×320, restores original architecture and sign pixels outside the edited
region, and maps it to the existing Hall palette. It then applies the current
Lost & Found sprites and luggage-desk removal patch through
`scripts/assets/lost-and-found.ts`. Runtime ground shadows remain separate.
