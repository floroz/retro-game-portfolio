---
task: HC5-zurich
items:
  - asset: zurich-plate@hd
    candidates: 3
    references: [assets-src/refs/hd/style-anchor.png]
    output: assets-src/exchange/raw/zurich-plate@hd/
    transparent_background: false
  - asset: zurich-desk@hd
    candidates: 3
    references:
      [assets-src/refs/hd/style-anchor.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/zurich-desk@hd/
    transparent_background: true
  - asset: zurich-chair@hd
    candidates: 3
    references:
      [assets-src/refs/hd/style-anchor.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/zurich-chair@hd/
    transparent_background: true
  - asset: zurich-cabinet@hd
    candidates: 3
    references:
      [assets-src/refs/hd/style-anchor.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/zurich-cabinet@hd/
    transparent_background: true
  - asset: zurich-cabinet-open@hd
    candidates: 3
    references:
      [assets-src/refs/hd/style-anchor.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/zurich-cabinet-open@hd/
    transparent_background: true
  - asset: zurich-door@hd
    candidates: 3
    references:
      [assets-src/refs/hd/style-anchor.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/zurich-door@hd/
    transparent_background: true
  - asset: zurich-door-open@hd
    candidates: 3
    references:
      [assets-src/refs/hd/style-anchor.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/zurich-door-open@hd/
    transparent_background: true
  - asset: zurich-plant@hd
    candidates: 3
    references:
      [assets-src/refs/hd/style-anchor.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/zurich-plant@hd/
    transparent_background: true
  - asset: zurich-cuckoo@hd
    candidates: 3
    references: [assets-src/refs/hd/style-anchor.png]
    output: assets-src/exchange/raw/zurich-cuckoo@hd/
    transparent_background: true
---

The layers of the chosen Zurich composite (`assets-src/refs/hd/style-anchor.png`, candidate 04, picked by Daniele at HG1): the empty-room plate, made by editing the composite, then each free-standing or stateful object and the one moving prop as a separate sprite. Each item has its own prompt, references, and settings.

Layers this file doesn't make, because the engine draws them or they stay painted in the plate:

- **Procedural effects** (E4): the twinkling stars, the glints on the lake, and the CRT's blinking cursor. The plate keeps the sky and lake as painted; the desk's CRT screen is dark and blank.
- **Painted into the plate:** the window with its view, the cuckoo clock (with its weights and pendulum), the oval rug, the wallpaper, the moonlight on the wall, the baseboard, and the floor. The lamp's glow isn't an effect, so the lamp is painted lit on the desk sprite and its warm light on the floor stays in the plate.

## Prompt: zurich-plate@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. Edit the reference image, a finished adventure-game scene of an office in Zurich at night, into the same room with its furniture taken out. Remove exactly these, completely, leaving no trace, outline, shadow, or ghost of them: the wooden desk and everything on it (the CRT computer, the keyboard, the green-shaded desk lamp, the pen cup, and the books); the violet-blue office chair; the grey filing cabinet on the right; the potted plant in the bottom-left corner; and the door on the right wall, with its frame and trim. Where each one stood, continue what is behind it naturally: the striped plum wallpaper with its stripes lined up, the moonlight falling diagonally across the wall, the baseboard running unbroken along the whole back wall, the wooden floor planks with their lines and reflections, and the whole oval red rug with its gold ring, now complete where the desk and chair stood on it. Keep everything else exactly as it is: the big window with the starry sky, the crescent moon, the Alps, and the lit town reflected in the lake; the cuckoo clock on the wall with its dial, weights, and pendulum; the rug; and the warm lamplight and cool moonlight on the floor and walls. Same image size, same framing, same lighting, same colours, the same painting style; change nothing else and add nothing. The cuckoo clock's dial has simple hands and no numerals. The room is empty of people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size.

## Prompt: zurich-desk@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the wooden desk from the first reference, with everything on it, drawn exactly as it appears there: the same angle, the same lighting, the same colours, and the same painting style and ink outline weight. On the desk, just as in the reference: the beige CRT computer monitor with its screen dark and blank, the beige keyboard in front of it, the navy pen cup with pencils, the green-shaded brass desk lamp, lit, with its warm light painted on the desk top, and the two stacked books with plain blank spines. The desk is complete, including the parts the chair hides in the reference: the left leg, the knee space, and the three brass-handled drawers of the pedestal on the right. Only the desk and the things on it: no chair, no rug, no floor, no wall, no shadow, no glow or light spill outside the object's outline, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the desk's proportions true beside a person (a desk is about half a person's height); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the desk is about 130 pixels wide, so keep the monitor, lamp, pen cup, and books as bold, simple shapes.

## Prompt: zurich-chair@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the light, soft violet-blue office chair from the first reference, drawn exactly as it appears there: seen from behind at the same angle, with the same lighting, the same colours, and the same painting style and ink outline weight. The whole chair: the padded backrest, the seat, the gas-lift column, and the five-spoke base with its casters. Only the chair: no desk, no rug, no floor, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the chair's proportions true beside a person; never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the chair is about 65 pixels tall, so keep its casters and spokes bold and simple.

## Prompt: zurich-cabinet@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the grey metal filing cabinet from the first reference, drawn exactly as it appears there: the same angle, the same lighting, the same colours, and the same painting style and ink outline weight. Every drawer closed, with the same handles and label holders as in the reference; the card on the top drawer is a plain blank panel and every label holder is blank. Only the cabinet: no floor, no wall, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the cabinet's proportions true beside a person (a filing cabinet stands almost as tall as a person at the back of the room); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the cabinet is about 85 pixels tall.

## Prompt: zurich-cabinet-open@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the grey metal filing cabinet from the first reference, drawn exactly as it appears there: the same angle, the same lighting, the same colours, and the same painting style and ink outline weight, with one change: its middle drawer is pulled open towards the viewer, about a third of its depth, showing the drawer's top edge and, inside, a row of plain manila hanging folders with blank tabs. Every other drawer stays closed, with the same handles and label holders as in the reference; the card on the top drawer is a plain blank panel and every label holder and folder tab is blank. The cabinet's body is the same size and shape as in the reference; only the open drawer sticks out of it. Only the cabinet: no loose papers, no floor, no wall, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the cabinet's proportions true beside a person; never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the cabinet is about 85 pixels tall, so keep the folders as a few bold, simple shapes.

## Prompt: zurich-door@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the full-height wooden door on the right wall of the first reference, closed, drawn exactly as it appears there, seen straight on, with the same lighting, the same colours, and the same painting style and ink outline weight. The door with its frame and trim: the flat, blank frosted pane at the top, the panel below it, and the brass knob on the left. Only the door and its frame: no wallpaper, no baseboard, no floor, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the door's proportions true beside a person (a door is about 1.3 times a person's height); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the door is about 140 pixels tall.

## Prompt: zurich-door-open@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the full-height wooden door on the right wall of the first reference, standing open, seen straight on, with the same lighting, the same colours, and the same painting style and ink outline weight. Its frame and trim are exactly as in the reference, the same size and shape as for the closed door. The door has swung away from the viewer, into the corridor, on hinges on its right side, so the door itself shows only as a narrow, foreshortened sliver of its edge and panel against the right side of the frame. Through the doorway, a dim, cool, empty corridor fills the whole opening: a darker plum wall, the wooden floor planks running away into shadow, and soft cool light, with no lamps, pictures, signs, or other doors. Only the door, its frame, and the corridor inside the frame: no wallpaper or baseboard outside the frame, no room floor, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the door's proportions true beside a person (a door is about 1.3 times a person's height); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the door is about 140 pixels tall, so keep the corridor to a few bold, simple shapes.

## Prompt: zurich-plant@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the potted rubber plant from the bottom-left corner of the first reference, drawn exactly as it appears there: the same angle, the same lighting, the same colours, and the same painting style and ink outline weight. The whole plant and pot, including the parts the image edges cut off in the reference: every broad, glossy green leaf on its stems, the soil, and the complete terracotta pot down to its base. Only the plant in its pot: no floor, no wall, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the plant's proportions true beside a person; never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the plant is about 145 pixels tall, so keep the leaves as bold, simple shapes.

## Prompt: zurich-cuckoo@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the little carved bird that pops out of the cuckoo clock in the reference, alone, seen in side view, facing left, with its beak open mid-call and its wings folded. It is painted in the same style as the clock: carved and painted wood in the same warm browns and golds, with the same lighting, the same painting style, and the same ink outline weight. Just the bird: no clock, no little door, no perch, no wall, no shadow, and nothing else. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the bird is only about 14 pixels long, so give it one bold, simple, instantly readable silhouette: round body, head, beak, and tail.

## For Codex

- **Check the references first.** Every item uses `assets-src/refs/hd/style-anchor.png` (the chosen composite, 1774×887), and every object except the cuckoo also uses `assets-src/refs/hd/scale-sheet.png`. If either file is missing, stop and report it; never generate without it.
- For each item above, generate exactly 3 images with the built-in image tool: one call per image, that item's prompt passed exactly as written each time, with that item's `transparent_background` setting, and `referenced_image_paths` set to that item's `references`, in the order listed, as absolute paths inside `../rgp-codex/`.
- **The plate is an edit.** Run `zurich-plate@hd` as an edit of `assets-src/refs/hd/style-anchor.png`: it is the only reference and the image being edited, with `transparent_background: false`. If the tool offers an edit mode for a referenced image, use it. Make each of the 3 candidates as a fresh edit of that original file, never of an earlier output. Don't resize or crop the result; record its size in `NOTES.md`.
- **Transparency fallback for the sprites.** If the tool rejects `transparent_background: true` or returns an opaque background, set it to `false` and, in the prompt, replace "on a transparent background" with "on a flat, solid, pure magenta (#FF00FF) background"; use that text for every remaining sprite image and record the change in that item's `NOTES.md`.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to its item's output folder as `NN.png` (`01` to `03`): `assets-src/exchange/raw/zurich-plate@hd/`, `zurich-desk@hd/`, `zurich-chair@hd/`, `zurich-cabinet@hd/`, `zurich-cabinet-open@hd/`, `zurich-door@hd/`, `zurich-door-open@hd/`, `zurich-plant@hd/`, and `zurich-cuckoo@hd/`, all under `assets-src/exchange/raw/`. In each folder, append the exact prompt text, the references in call order, and anything that went wrong to `NOTES.md`, and write an empty `DONE` last, only once that folder's 3 images and `NOTES.md` are in place.
- Replace an image once only if:
  - **the plate** still shows any part, outline, or ghost of a removed object (desk, chair, cabinet, plant, door), adds anything new, or changes the framing, the window view, the cuckoo clock, the rug, or the lighting;
  - **a sprite** has a room, floor, or wall painted behind it, another object with it, a background that's neither transparent nor flat magenta, a different angle or colours from the reference, or a missing part the prompt asks for;
  - **any image** has visible text, lettering, or numbers, people or grey scale-sheet shapes, pixel-art or 3D rendering, or the wrong subject.

  Record every replacement in that item's `NOTES.md`.
