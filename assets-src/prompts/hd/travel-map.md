---
asset: travel-map-bg@hd
task: HC2
candidates: 4
references:
  [
    assets-src/refs/hd/travel-map-current.png,
    assets-src/refs/hd/style-anchor.png,
  ]
output: assets-src/exchange/raw/travel-map-bg@hd/
transparent_background: false
---

## Prompt

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. This is an HD repaint of the first reference, a travel map from an adventure game, as a wide 2:1 landscape filling the whole frame. The second reference is the approved style anchor: match its painting style, ink outline weight, and level of detail, but not its colours or its subject. Subject: a flat, top-down, hand-painted sepia map of Western Europe on aged parchment, lit flat like a printed page: land and sea in two sepia tones, a darker inked coastline, gentle painted relief, and small painted mountain ranges. Keep every coastline exactly where the first reference has it, from Britain to southern Italy, at the same position and scale, because the game places its markers by position. Keep it bare: no markers, dots, or pins, no route lines, no labels or place names, no borders, no compass rose, no grid, no sea monsters or ships, no heavy stains, and no mountains painted over London, Zurich, or Sorrento. Sepia and warm brown tones only. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size.

## For Codex

- Generate exactly 4 images with the built-in image tool: one call per image, the prompt above passed exactly as written each time, `transparent_background: false`, and `referenced_image_paths` set to these files, in this order, as absolute paths inside `../rgp-codex/`: `assets-src/refs/hd/travel-map-current.png`, `assets-src/refs/hd/style-anchor.png`. Every reference must exist before you start; if one is missing, stop and report it rather than generating without it. `style-anchor.png` is created at gate HG1, so this prompt can't run before then.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to `assets-src/exchange/raw/travel-map-bg@hd/NN.png` (`01` to `04`), append the exact prompt text and anything that went wrong to `assets-src/exchange/raw/travel-map-bg@hd/NOTES.md`, and write an empty `assets-src/exchange/raw/travel-map-bg@hd/DONE` last.
- Replace an image once only if it has visible lettering or numbers, markers, pins, route lines, or a compass rose, coastlines that clearly depart from the first reference, pixel-art or 3D rendering, or the wrong subject.
