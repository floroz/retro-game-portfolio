---
task: HC5-sorrento
items:
  - asset: sorrento-plate@hd
    candidates: 3
    references: [assets-src/refs/hd/sorrento-chosen.png]
    output: assets-src/exchange/raw/sorrento-plate@hd/
    transparent_background: false
  - asset: sorrento-door@hd
    candidates: 3
    references:
      [
        assets-src/refs/hd/sorrento-chosen.png,
        assets-src/refs/hd/scale-sheet.png,
      ]
    output: assets-src/exchange/raw/sorrento-door@hd/
    transparent_background: true
  - asset: sorrento-door-open@hd
    candidates: 3
    references:
      [
        assets-src/refs/hd/sorrento-chosen.png,
        assets-src/refs/hd/scale-sheet.png,
      ]
    output: assets-src/exchange/raw/sorrento-door-open@hd/
    transparent_background: true
  - asset: sorrento-stove@hd
    candidates: 3
    references:
      [
        assets-src/refs/hd/sorrento-chosen.png,
        assets-src/refs/hd/scale-sheet.png,
      ]
    output: assets-src/exchange/raw/sorrento-stove@hd/
    transparent_background: true
  - asset: sorrento-table@hd
    candidates: 3
    references:
      [
        assets-src/refs/hd/sorrento-chosen.png,
        assets-src/refs/hd/scale-sheet.png,
      ]
    output: assets-src/exchange/raw/sorrento-table@hd/
    transparent_background: true
  - asset: sorrento-chair-left@hd
    candidates: 3
    references:
      [
        assets-src/refs/hd/sorrento-chosen.png,
        assets-src/refs/hd/scale-sheet.png,
      ]
    output: assets-src/exchange/raw/sorrento-chair-left@hd/
    transparent_background: true
  - asset: sorrento-chair-right@hd
    candidates: 3
    references:
      [
        assets-src/refs/hd/sorrento-chosen.png,
        assets-src/refs/hd/scale-sheet.png,
      ]
    output: assets-src/exchange/raw/sorrento-chair-right@hd/
    transparent_background: true
  - asset: sorrento-lemon-tree@hd
    candidates: 3
    references:
      [
        assets-src/refs/hd/sorrento-chosen.png,
        assets-src/refs/hd/scale-sheet.png,
      ]
    output: assets-src/exchange/raw/sorrento-lemon-tree@hd/
    transparent_background: true
  - asset: sorrento-ferry@hd
    candidates: 3
    references: [assets-src/refs/hd/sorrento-chosen.png]
    output: assets-src/exchange/raw/sorrento-ferry@hd/
    transparent_background: true
---

The layers of the chosen Sorrento composite (`assets-src/refs/hd/sorrento-chosen.png`, candidate 01, picked by the Opus orchestrator and confirmed by Daniele): the empty-kitchen plate, made by editing the composite, then each free-standing or stateful object and the one moving prop as a separate sprite. Each item has its own prompt, references, and settings.

Layers this file doesn't make, because the engine draws them or they stay painted in the plate:

- **Procedural effects** (E4): the glints on the sea and the steam from the moka pot. The plate keeps the sea and sunset as painted, and the stove sprite's moka pot is plain, with no steam.
- **Painted into the plate:** the window with its open green shutters and its view (the setting sun, Ischia, Vesuvius, the Naples shore, and the sunlit sea), the sill with its bowl of lemons, the olive-oil bottle and the lemon bush, the majolica plate, the herbs and garlic, the fridge with its three small pictures and its blank yellow note, the wall phone with its cord and the blank card above it, the shelf with its china, the copper pans on their rail, the ceiling beams, the terracotta wall, the tiled floor with its blue flowers, and the golden sunset light across the floor and walls. The fridge is a hotspot with no state, so it stays in the plate.
- **Foreground:** the potted lemon tree at the right edge is drawn in front of the walkers, so it is a separate sprite (`sorrento-lemon-tree@hd`).

## Prompt: sorrento-plate@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. Edit the reference image, a finished adventure-game scene of a kitchen in Sorrento at sunset, into the same room with its furniture and door taken out. Remove exactly these, completely, leaving no trace, outline, shadow, or ghost of them: the green door on the left, with its dark wooden frame and threshold; the cream gas stove with the moka pot on it and the yellow checked towel hanging from it; the table with its yellow gingham tablecloth and everything on it (the two cups and the small bowl); the two wooden chairs with their woven seats; and the potted lemon tree in the terracotta pot on the right, with its pot. Where each one stood, continue what is behind it naturally: the terracotta-red plaster wall with its wooden skirting board running unbroken along the whole back wall, including the left wall where the door stood, lit by the same warm sunset glow; and the tiled floor with its pale tiles, blue four-petal flowers, and golden light patches, the tile lines and flowers lined up and continuing unbroken across the whole floor, with no shadow where the table, chairs, stove, and pot stood. Keep everything else exactly as it is: the window with its open green shutters and the whole view of the sea, the setting sun, Ischia, Vesuvius, and the Naples shore; the sill with its bowl of lemons, the olive-oil bottle, and the lemon bush; the majolica plate; the herbs and garlic; the fridge with its three small pictures and blank yellow note; the wall phone with its cord and the blank card above it; the shelf with its china; the copper pans on their rail; the ceiling beams; and the warm sunset light on the walls and floor. Same image size, same framing, same lighting, same colours, the same painting style; change nothing else and add nothing. The room is empty of people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size.

## Prompt: sorrento-door@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the green wooden door on the left wall of the first reference, closed, drawn exactly as it appears there, seen straight on, with the same lighting, the same colours, and the same painting style and ink outline weight. The door with its dark wooden frame: four glass panes in the upper part, showing the warm sunset sky and a lemon grove painted in them, the two panels below, and the brass knob on the right. Only the door and its frame: no wall, no skirting board, no floor, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the door's proportions true beside a person (a door is about 1.3 times a person's height); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the door with its frame is about 58 pixels wide and 155 pixels tall.

## Prompt: sorrento-door-open@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the green wooden door on the left wall of the first reference, standing open, seen straight on, with the same lighting, the same colours, and the same painting style and ink outline weight. Its dark wooden frame is exactly as in the reference, the same size and shape as for the closed door. The door has swung away from the viewer, out into the garden, on hinges on its left side, so the door itself shows only as a narrow, foreshortened sliver of its edge and panel against the left side of the frame. Through the doorway, a warm, empty garden at sunset fills the whole opening: a glowing orange and pink sky, a few lemon trees, and sunlit flagstones running away, with no buildings, signs, or people. Only the door, its frame, and the garden inside the frame: no wall or skirting board outside the frame, no kitchen floor, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the door's proportions true beside a person (a door is about 1.3 times a person's height); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the door with its frame is about 58 pixels wide and 155 pixels tall, so keep the garden to a few bold, simple shapes.

## Prompt: sorrento-stove@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the cream gas stove from the first reference, drawn exactly as it appears there: the same angle, the same lighting, the same colours, and the same painting style and ink outline weight. The whole stove: the cream enamel body with chrome trim, the four burners with their grates, the row of chrome knobs, the oven door with its window and handle, the yellow checked towel hanging from the handle, and the short feet. On the top right stands the aluminium moka pot with its lid, plain, with no steam or smoke. Only the stove and the moka pot on it: no wall, no floor, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the stove's proportions true beside a person (a stove comes up to about 0.6 times a person's height, with the moka pot on top); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the stove with its moka pot is about 75 pixels wide and 75 pixels tall, so keep the knobs and burners as bold, simple shapes.

## Prompt: sorrento-table@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the small square wooden table from the first reference, drawn exactly as it appears there: the same angle, the same lighting, the same colours, and the same painting style and ink outline weight. The table with its yellow and white gingham tablecloth hanging over the edges, the four dark wooden legs complete down to their feet, and, on top, two white cups on saucers and a small blue and white bowl between them. Only the table and what is on it: no chairs, no floor, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the table's proportions true beside a person (a table comes up to about 0.45 times a person's height); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the table is about 100 pixels wide and 70 pixels tall, so keep the cups and the gingham as bold, simple shapes.

## Prompt: sorrento-chair-left@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the left-hand wooden chair from the first reference, drawn exactly as it appears there: the same angle, with its back on the left and its woven rush seat facing right towards the table, the same lighting, the same colours, and the same painting style and ink outline weight. The whole chair: the tall dark wooden ladder back with its rungs, the woven rush seat, and the four legs with their crosspieces, down to the feet. Only the chair: no table, no floor, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the chair's proportions true beside a person (a chair back comes up to about 0.55 times a person's height); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the chair is about 35 pixels wide and 80 pixels tall, so keep its rungs and legs as bold, simple shapes.

## Prompt: sorrento-chair-right@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the right-hand wooden chair from the first reference, drawn exactly as it appears there: the same angle, with its back on the right and its woven rush seat facing left towards the table, the same lighting, the same colours, and the same painting style and ink outline weight. The whole chair: the tall dark wooden ladder back with its rungs, the woven rush seat, and the four legs with their crosspieces, down to the feet. Only the chair: no table, no floor, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the chair's proportions true beside a person (a chair back comes up to about 0.55 times a person's height); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the chair is about 35 pixels wide and 80 pixels tall, so keep its rungs and legs as bold, simple shapes.

## Prompt: sorrento-lemon-tree@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the potted lemon tree from the right edge of the first reference, drawn exactly as it appears there: the same angle, the same lighting, the same colours, and the same painting style and ink outline weight. The whole tree and pot, including the parts the image edges cut off in the reference: the slim trunk, the dense crown of glossy dark green leaves with its bright yellow lemons, and the complete terracotta pot down to its base. Only the tree in its pot: no floor, no wall, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the lemon tree's proportions true beside a person (a potted lemon tree stands a little taller than a person); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the tree is about 75 pixels wide and 175 pixels tall, so keep the leaves and lemons as bold, simple shapes.

## Prompt: sorrento-ferry@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: a small passenger ferry in side view, seen far away across the sea, facing right, at sunset: a white hull with a blue stripe, two decks with a row of small dark windows, a short funnel, and a plain blank flag. It is lit warmly from the left by the setting sun, with the same colours and the same painting style and ink outline weight as the reference. Just the ferry: no water, no wake, no sky, no smoke, no shadow, and nothing else. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the ferry is only about 32 pixels long and 12 pixels tall, so give it one bold, simple, instantly readable silhouette: hull, two decks, and funnel.

## For Codex

- **Check the references first.** Every item uses `assets-src/refs/hd/sorrento-chosen.png` (the chosen composite, 1774×887), and every object sprite also uses `assets-src/refs/hd/scale-sheet.png`; the moving prop uses only the composite. If either file is missing, stop and report it; never generate without it.
- For each item above, generate exactly 3 images with the built-in image tool: one call per image, that item's prompt passed exactly as written each time, with that item's `transparent_background` setting, and `referenced_image_paths` set to that item's `references`, in the order listed, as absolute paths inside `../rgp-codex/`.
- **The plate is an edit.** Run `sorrento-plate@hd` as an edit of `assets-src/refs/hd/sorrento-chosen.png`: it is the only reference and the image being edited, with `transparent_background: false`. If the tool offers an edit mode for a referenced image, use it. Make each of the 3 candidates as a fresh edit of that original file, never of an earlier output. Don't resize or crop the result; record its size in `NOTES.md`.
- **Transparency fallback for the sprites.** If the tool rejects `transparent_background: true` or returns an opaque background, set it to `false` and, in the prompt, replace "on a transparent background" with "on a flat, solid, pure magenta (#FF00FF) background"; use that text for every remaining sprite image and record the change in that item's `NOTES.md`.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to its item's output folder as `NN.png` (`01` to `03`): `sorrento-plate@hd/`, `sorrento-door@hd/`, `sorrento-door-open@hd/`, `sorrento-stove@hd/`, `sorrento-table@hd/`, `sorrento-chair-left@hd/`, `sorrento-chair-right@hd/`, `sorrento-lemon-tree@hd/`, `sorrento-ferry@hd/`, all under `assets-src/exchange/raw/`. In each folder, append the exact prompt text, the references in call order, and anything that went wrong to `NOTES.md`, and write an empty `DONE` last, only once that folder's 3 images and `NOTES.md` are in place.
- Replace an image once only if:
  - **the plate** still shows any part, outline, or ghost of a removed object (door, stove, table, chairs, lemon tree), adds anything new, or changes the framing, the window view, the shutters, the fridge, the phone, the pans, or the lighting;
  - **a sprite** has a room, floor, or wall painted behind it, another object with it, a background that's neither transparent nor flat magenta, a different angle or colours from the reference, or a missing part the prompt asks for;
  - **any image** has visible text, lettering, or numbers, people or grey scale-sheet shapes, pixel-art or 3D rendering, or the wrong subject.

  Record every replacement in that item's `NOTES.md`.
