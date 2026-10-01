---
task: HC5-hall
items:
  - asset: hall-plate@hd
    candidates: 3
    references: [assets-src/refs/hd/hall-chosen.png]
    output: assets-src/exchange/raw/hall-plate@hd/
    transparent_background: false
  - asset: hall-seats@hd
    candidates: 3
    references:
      [assets-src/refs/hd/hall-chosen.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/hall-seats@hd/
    transparent_background: true
  - asset: hall-arch@hd
    candidates: 3
    references:
      [assets-src/refs/hd/hall-chosen.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/hall-arch@hd/
    transparent_background: true
  - asset: hall-plant@hd
    candidates: 3
    references:
      [assets-src/refs/hd/hall-chosen.png, assets-src/refs/hd/scale-sheet.png]
    output: assets-src/exchange/raw/hall-plant@hd/
    transparent_background: true
  - asset: hall-plane@hd
    candidates: 3
    references: [assets-src/refs/hd/hall-chosen.png]
    output: assets-src/exchange/raw/hall-plane@hd/
    transparent_background: true
---

The layers of the chosen Hall composite (`assets-src/refs/hd/hall-chosen.png`, candidate 02, picked by the Opus orchestrator and confirmed by Daniele): the empty-lounge plate, made by editing the composite, then each free-standing object and the one moving prop as a separate sprite. Each item has its own prompt, references, and settings.

Layers this file doesn't make, because the engine draws them or they stay painted in the plate:

- **Procedural effects** (E4): the split-flap flutter on the departures board. The plate keeps the board painted with its blank dark panels; the engine letters on top.
- **Painted into the plate:** the departures board, the duty-free shop with its shelves and products (perfume, snow globe, postcards, whisky, toolbox), the two hanging flight monitors, the big glass wall with the parked airliner, the luggage carousel, the lost-luggage desk with its suitcase and bell, the three pairs of glass gate doors with their blank dark boards above them and the small kiosks beside them, the ceiling lights, the sunlit walls, the pillar at the right edge, and the teal carpet with its purple triangles. The gates are exits but have no open state, so they stay in the plate. The parked airliner is part of the view; the plane taking off is a separate sprite that the engine slides over the sky.

## Prompt: hall-plate@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. Edit the reference image, a finished adventure-game scene of an airport departure lounge by day, into the same room with its furniture and plant taken out. Remove exactly these, completely, leaving no trace, outline, shadow, or ghost of them: the row of five blue seats on their grey steel bench, with its legs and feet; the grey security arch, with its two posts, its top box, and its small lights; and the potted rubber plant in the bottom-right corner, with its pot. Where each one stood, continue what is behind it naturally: the teal carpet with its purple triangle pattern, the triangles lined up and continuing unbroken across the whole floor, with no smudge or pale patch where the seats stood; the base of the glass wall, the gate doors, the small kiosks, and the pale wall beneath them, running unbroken behind the arch; and the tall pillar at the right edge of the image, now running down to the carpet where the plant hid it. Keep everything else exactly as it is: the departures board, the duty-free shop with everything on its shelves, the two hanging flight monitors, the big glass wall with the parked airliner, the runway, the trees and the blue sky with its clouds, the luggage carousel, the lost-luggage desk with its suitcase and bell, the three pairs of glass gate doors with the blank dark boards above them and the small kiosks beside them, the ceiling lights, and the warm sunlight on the walls. The sky stays free of any flying plane. Same image size, same framing, same lighting, same colours, the same painting style; change nothing else and add nothing. The room is empty of people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size.

## Prompt: hall-seats@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the row of five blue moulded airport seats on their grey steel bench, from the first reference, drawn exactly as they appear there: seen straight on, with the same lighting, the same colours, and the same painting style and ink outline weight. The whole bench: the five seats with their armrests, the long grey steel beam, and the three legs with their feet. The space between the legs and under the beam is empty and transparent. Only the row of seats: no carpet, no wall, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the seats's proportions true beside a person (a row of seats comes up to about half a person's height); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the row is about 175 pixels wide and 55 pixels tall, so keep the armrests and legs as bold, simple shapes.

## Prompt: hall-arch@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the grey metal security arch from the first reference, drawn exactly as it appears there: seen straight on, with the same lighting, the same colours, and the same painting style and ink outline weight. The whole arch: the two square posts with their feet, the top box with its small dark display and its one red and one green light. The opening between the two posts is empty and fully transparent, so the scene shows through it. Only the security arch: no floor, no wall, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the security arch's proportions true beside a person (an airport security arch stands roughly as tall as a person at the back of the room); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the arch is about 70 pixels wide and 105 pixels tall, so keep its lights and display as bold, simple shapes.

## Prompt: hall-plant@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: the potted rubber plant from the bottom-right corner of the first reference, drawn exactly as it appears there: the same angle, the same lighting, the same colours, and the same painting style and ink outline weight. The whole plant and pot, including the parts the image edges cut off in the reference: every broad, glossy green leaf on its stems, the soil, and the complete terracotta pot down to its base. Only the plant in its pot: no floor, no wall, no shadow, and nothing else. The second reference is a scale sheet, not part of the picture: use it only to keep the plant's proportions true beside a person (a big floor plant stands a little taller than a person); never paint the grey figures, the grey shapes, or the dashed lines. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the plant is about 85 pixels wide and 165 pixels tall, so keep the leaves as bold, simple shapes.

## Prompt: hall-plane@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A single game sprite, on a transparent background: a passenger airliner taking off, in side view, facing left with its nose pitched up about fifteen degrees, its undercarriage folded away. It is painted in the same style as the parked airliner in the reference window: cream-white fuselage with a row of small dark windows, a grey wing with an engine under it, and a plain blank tail fin, with the same lighting, the same colours, and the same painting style and ink outline weight. Just the plane: no sky, no clouds, no runway, no smoke, no shadow, and nothing else. No people. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size. In that 640×320 scene the plane is only about 40 pixels long, so give it one bold, simple, instantly readable silhouette: fuselage, wing, engine, and tail.

## For Codex

- **Check the references first.** Every item uses `assets-src/refs/hd/hall-chosen.png` (the chosen composite, 1774×887), and every object sprite also uses `assets-src/refs/hd/scale-sheet.png`; the moving prop uses only the composite. If either file is missing, stop and report it; never generate without it.
- For each item above, generate exactly 3 images with the built-in image tool: one call per image, that item's prompt passed exactly as written each time, with that item's `transparent_background` setting, and `referenced_image_paths` set to that item's `references`, in the order listed, as absolute paths inside `../rgp-codex/`.
- **The plate is an edit.** Run `hall-plate@hd` as an edit of `assets-src/refs/hd/hall-chosen.png`: it is the only reference and the image being edited, with `transparent_background: false`. If the tool offers an edit mode for a referenced image, use it. Make each of the 3 candidates as a fresh edit of that original file, never of an earlier output. Don't resize or crop the result; record its size in `NOTES.md`.
- **Transparency fallback for the sprites.** If the tool rejects `transparent_background: true` or returns an opaque background, set it to `false` and, in the prompt, replace "on a transparent background" with "on a flat, solid, pure magenta (#FF00FF) background"; use that text for every remaining sprite image and record the change in that item's `NOTES.md`.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to its item's output folder as `NN.png` (`01` to `03`): `hall-plate@hd/`, `hall-seats@hd/`, `hall-arch@hd/`, `hall-plant@hd/`, `hall-plane@hd/`, all under `assets-src/exchange/raw/`. In each folder, append the exact prompt text, the references in call order, and anything that went wrong to `NOTES.md`, and write an empty `DONE` last, only once that folder's 3 images and `NOTES.md` are in place.
- Replace an image once only if:
  - **the plate** still shows any part, outline, or ghost of a removed object (seats, arch, plant), adds anything new, or changes the framing, the duty-free shop, the glass wall with the parked airliner, the gate doors and boards, or the lighting;
  - **a sprite** has a room, floor, or wall painted behind it, another object with it, a background that's neither transparent nor flat magenta, a different angle or colours from the reference, or a missing part the prompt asks for;
  - **any image** has visible text, lettering, or numbers, people or grey scale-sheet shapes, pixel-art or 3D rendering, or the wrong subject.

  Record every replacement in that item's `NOTES.md`.
