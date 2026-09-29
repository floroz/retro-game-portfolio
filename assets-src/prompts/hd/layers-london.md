---
task: HC5-london
items:
  - asset: london-plate@hd
    candidates: 3
    references: [assets-src/refs/hd/london-chosen.png]
    output: assets-src/exchange/raw/london-plate@hd/
    transparent_background: false
  - asset: london-table@hd
    candidates: 3
    references:
      [assets-src/refs/hd/london-chosen.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/london-table@hd/
    transparent_background: true
  - asset: london-bar@hd
    candidates: 3
    references:
      [assets-src/refs/hd/london-chosen.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/london-bar@hd/
    transparent_background: true
  - asset: london-fruit-machine@hd
    candidates: 3
    references:
      [assets-src/refs/hd/london-chosen.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/london-fruit-machine@hd/
    transparent_background: true
  - asset: london-door@hd
    candidates: 3
    references:
      [assets-src/refs/hd/london-chosen.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/london-door@hd/
    transparent_background: true
  - asset: london-door-open@hd
    candidates: 3
    references:
      [assets-src/refs/hd/london-chosen.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/london-door-open@hd/
    transparent_background: true
  - asset: london-stool@hd
    candidates: 3
    references:
      [assets-src/refs/hd/london-chosen.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/london-stool@hd/
    transparent_background: true
  - asset: london-bus@hd
    candidates: 3
    references: [assets-src/refs/hd/london-chosen.png]
    output: assets-src/exchange/raw/london-bus@hd/
    transparent_background: true
---

The layers of the chosen London composite (`assets-src/refs/hd/london-chosen.png`, candidate 02, picked by the Opus orchestrator and confirmed by Daniele): the empty-pub plate, made by editing the composite, then each free-standing or stateful object and the one moving prop as a separate sprite. Each item has its own prompt, references, and settings.

Layers this file doesn't make, because the engine draws them or they stay painted in the plate:

- **Procedural effects** (E4): the rain on the window, the fruit machine's chasing lamps, the eight beer taps standing on the bar top, and the six photo frames on the wall. The plate and the bar sprite keep a clear bar top and bare wall; the fruit machine's lamps are plain gold, unlit.
- **Painted into the plate:** the window with its view (St Paul's, the Gherkin, the Shard, the phone box, the lamp post, and the Thames), the tall shelves of bottles and tankards, the chalkboard with its blank wooden header, the pendant and wall lamps, the dartboard with its dart, the wainscot, the red panelled wall, the oval red rug with its gold ring, and the wooden floor. The lamps' warm light isn't an effect, so it stays in the plate.
- **Foreground:** the red-topped stool in the bottom-left corner is drawn in front of the walkers, so it is a separate sprite (`london-stool@hd`).

## Prompt: london-plate@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. Edit the reference image, a finished adventure-game scene of an old London pub on a rainy evening, into the same room with its furniture and door taken out. Remove exactly these, completely, leaving no trace, outline, shadow, or ghost of them: the round wooden table with its black pedestal and the two glasses of beer on it, and the two red-cushioned stools beside it; the long wooden bar counter with its brass foot rail and everything on it; the red and gold fruit machine on the right; the green front door on the left, with its arched fanlight, its wooden frame, and its stone step; and the red-topped bar stool in the bottom-left corner. Where each one stood, continue what is behind it naturally: the brown wainscot panelling running unbroken along the whole back wall, including behind where the bar stood, with the two tall bottle shelves ending on it at their solid bases; the dark red vertical-panelled wall above it and along the left, now unbroken where the door stood, with the skirting board below; the dark wooden floor planks with their warm reflections and lines, running right up to the walls, and the whole oval red rug with its gold ring, unchanged. Keep everything else exactly as it is: the window with the night view of St Paul's, the Gherkin, the Shard, the red phone box, the lamp post, and the lit river; the shelves of bottles and tankards; the big chalkboard with its blank wooden header and its chalk; the pendant lamps and the three wall lamps; the dartboard with its dart; and the warm lamplight on the walls and floor. Same image size, same framing, same lighting, same colours, the same painting style; change nothing else and add nothing. The room is empty of people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size.

## Prompt: london-table@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the round wooden pub table from the first reference, with the two stools beside it, drawn exactly as they appear there: seen from the same angle, with the same lighting, the same colours, and the same painting style and ink outline weight. The table: the round wooden top on its black cast-iron pedestal with a round base, and the two glasses of golden beer with foamy heads on top. One red-cushioned round stool on each side, with dark wooden legs and a brass footrest ring, both complete down to their feet. Only the table, its two beers, and its two stools: no floor, no wall, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the table's proportions true beside a person (a pub table comes up to about half a person's height, and a stool a little less); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the whole group is about 120 pixels wide and 65 pixels tall, so keep the glasses and the stool rings as bold, simple shapes.

## Prompt: london-bar@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the long wooden pub bar counter from the first reference, drawn exactly as it appears there: seen straight on, with the same lighting, the same colours, and the same painting style and ink outline weight. The whole counter: the polished bar top, the panelled front with its seven recessed panels, the brass foot rail with its brackets, and the plinth at the bottom. The bar top is completely clear and empty: no beer taps, no glasses, no towels, and nothing on it. Only the bar counter: no floor, no wall, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the bar counter's proportions true beside a person (a bar counter comes up to about 0.6 times a person's height); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the counter is about 320 pixels wide and 66 pixels tall.

## Prompt: london-fruit-machine@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the red and gold fruit machine from the first reference, drawn exactly as it appears there: seen straight on, with the same lighting, the same colours, and the same painting style and ink outline weight. The whole machine: the top box with its round gold lamps, the three reels showing a cherry, a lemon, and an orange (pictures only, no writing), the gold studs, the lever on the right, the coin slot, and the payout tray. All the lamps are plain gold domes, unlit, with no glow around them. Only the fruit machine: no floor, no wall, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the fruit machine's proportions true beside a person (a fruit machine stands nearly as tall as a person at the back of the room); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the machine is about 55 pixels wide and 100 pixels tall, so keep the reels and studs as bold, simple shapes.

## Prompt: london-door@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the green front door on the left wall of the first reference, closed, drawn exactly as it appears there, seen straight on, with the same lighting, the same colours, and the same painting style and ink outline weight. The door with its frame: the green panelled door with a blank frosted pane, the brass letterbox and the brass knob, the brass kick plate, the arched fanlight above it, the wooden frame around it, and the stone step below. The fanlight glass is plain and blank. Only the door with its frame and step: no wall, no wainscot, no floor, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the door's proportions true beside a person (a door is about 1.3 times a person's height); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the door with its frame is about 50 pixels wide and 135 pixels tall.

## Prompt: london-door-open@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the green front door on the left wall of the first reference, standing open, seen straight on, with the same lighting, the same colours, and the same painting style and ink outline weight. Its frame, fanlight, and stone step are exactly as in the reference, the same size and shape as for the closed door. The door has swung away from the viewer, out into the street, on hinges on its left side, so the door itself shows only as a narrow, foreshortened sliver of its edge and panel against the left side of the frame. Through the doorway, a dim, cool, empty night street fills the whole opening: dark blue air, a strip of wet pavement with soft reflections, and a pool of cool lamplight, with no lamps, signs, buildings, vehicles, or people. Only the door, its frame, and the street inside the frame: no wall or wainscot outside the frame, no room floor, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the door's proportions true beside a person (a door is about 1.3 times a person's height); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the door with its frame is about 50 pixels wide and 135 pixels tall, so keep the street to a few bold, simple shapes.

## Prompt: london-stool@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the red-topped round bar stool from the bottom-left corner of the first reference, drawn exactly as it appears there: the same angle, the same lighting, the same colours, and the same painting style and ink outline weight. The whole stool, including the parts the image edges cut off in the reference: the round red cushion, the dark wooden legs down to their feet, and the brass footrest ring. Only the stool: no floor, no wall, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the stool's proportions true beside a person (a bar stool comes up to about half a person's height); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the stool is about 60 pixels wide and 80 pixels tall, so keep its legs and ring bold and simple.

## Prompt: london-bus@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: a red London double-decker bus in side view, facing right, at night in the rain: bright red paint with a darker roof, a lower and an upper deck of warm yellow lit windows with the dark shapes of seats but no people, black wheels, and dim headlights. Painted in the same style as the reference: the same warm lights on a dark rainy evening, the same colours, and the same painting style and ink outline weight. The destination box and the side panels are plain and blank. Just the bus: no road, no wet reflections, no rain, no shadow, and nothing else. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the bus is only about 52 pixels long and 28 pixels tall, so give it one bold, simple, instantly readable silhouette: body, two rows of windows, and wheels.

## For Codex

- **Check the references first.** Every item uses `assets-src/refs/hd/london-chosen.png` (the chosen composite, 1774×887), and every object sprite also uses `assets-src/refs/hd/scale-sheet.png`; the moving prop uses only the composite. If either file is missing, stop and report it; never generate without it.
- For each item above, generate exactly 3 images with the built-in image tool: one call per image, that item's prompt passed exactly as written each time, with that item's `transparent_background` setting, and `referenced_image_paths` set to that item's `references`, in the order listed, as absolute paths inside `../rgp-codex/`.
- **The plate is an edit.** Run `london-plate@hd` as an edit of `assets-src/refs/hd/london-chosen.png`: it is the only reference and the image being edited, with `transparent_background: false`. If the tool offers an edit mode for a referenced image, use it. Make each of the 3 candidates as a fresh edit of that original file, never of an earlier output. Don't resize or crop the result; record its size in `NOTES.md`.
- **Transparency fallback for the sprites.** If the tool rejects `transparent_background: true` or returns an opaque background, set it to `false` and, in the prompt, replace "on a transparent background" with "on a flat, solid, pure magenta (#FF00FF) background"; use that text for every remaining sprite image and record the change in that item's `NOTES.md`.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to its item's output folder as `NN.png` (`01` to `03`): `london-plate@hd/`, `london-table@hd/`, `london-bar@hd/`, `london-fruit-machine@hd/`, `london-door@hd/`, `london-door-open@hd/`, `london-stool@hd/`, `london-bus@hd/`, all under `assets-src/exchange/raw/`. In each folder, append the exact prompt text, the references in call order, and anything that went wrong to `NOTES.md`, and write an empty `DONE` last, only once that folder's 3 images and `NOTES.md` are in place.
- Replace an image once only if:
  - **the plate** still shows any part, outline, or ghost of a removed object (table, stools, bar, fruit machine, door, foreground stool), adds anything new, or changes the framing, the window view, the shelves, the chalkboard, the dartboard, the rug, or the lighting;
  - **a sprite** has a room, floor, or wall painted behind it, another object with it, a background that's neither transparent nor flat magenta, a different angle or colours from the reference, or a missing part the prompt asks for;
  - **any image** has visible text, lettering, or numbers, people or grey scale-sheet shapes, pixel-art or 3D rendering, or the wrong subject.

  Record every replacement in that item's `NOTES.md`.
