---
asset: travel-map-bg@2x
task: RC5
candidates: 4
references:
  [
    assets-src/refs/remaster/travel-map-current@4x.png,
    assets-src/refs/remaster/style-anchor@4x.png,
  ]
output: assets-src/exchange/raw/travel-map-bg@2x/
transparent_background: false
---

## Prompt

Remastered 1990s LucasArts point-and-click adventure game art, in the hand-crafted style of The Curse of Monkey Island, rendered as crisp, high-detail pixel art. Hard pixel edges, no anti-aliasing, no blur, no glow, no bloom, no lens effects, no painterly brushwork. Rich but restrained shading with 3 to 6 steps per material, and fine material detail. No text, letters, numbers, signage, logos, or watermarks anywhere; signs and boards are blank. Slightly exaggerated cartoon proportions and bold, readable silhouettes. This is a remastered redraw of the reference image, a finished adventure-game scene. Keep its composition exactly: every object's position, size, and silhouette, the colours, the light, and the mood. Redraw it sharper and more detailed, at twice the resolution. Areas that are bare in the reference stay bare. Match the second reference's pixel density, outline style, shading, and level of detail exactly. Subject: a flat, top-down, hand-drawn sepia map of Western Europe printed on aged paper, lit flat like a printed page: land and sea in two sepia tones with a darker coastline, and small mountain triangles. Keep every coastline exactly where the reference has it, from Britain to southern Italy. Keep it bare: no markers, dots, or pins, no route lines, no labels or place names, no borders, no compass rose, no grid, no speckles or stains, and no mountains added above London, Zurich, or Sorrento. Sepia and warm brown tones only.

## For Codex

- Generate exactly 4 images with the built-in image tool: one call per image, the prompt above passed exactly as written each time, `transparent_background: false`, and `referenced_image_paths` set to these files, in this order, as absolute paths inside `../rgp-codex/`: `assets-src/refs/remaster/travel-map-current@4x.png`, `assets-src/refs/remaster/style-anchor@4x.png`. Every reference must exist before you start; if one is missing, stop and report it rather than generating without it.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to `assets-src/exchange/raw/travel-map-bg@2x/NN.png` (`01` to `04`), append the exact prompt text and anything that went wrong to `assets-src/exchange/raw/travel-map-bg@2x/NOTES.md`, and write an empty `assets-src/exchange/raw/travel-map-bg@2x/DONE` last.
- Replace an image once only if it has visible lettering or numbers, pictures, frames, or props painted into the areas the prompt keeps bare, people, a layout that clearly departs from the first reference, or the wrong subject.
