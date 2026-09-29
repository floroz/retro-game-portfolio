---
asset: travel-map-bg
task: C4
candidates: 6
references: [assets-src/refs/style-anchor@8x.png]
output: assets-src/exchange/raw/travel-map-bg/
transparent_background: false
---

## Prompt

1990s LucasArts SCUMM point-and-click adventure game art, VGA era, in the style of Monkey Island 2, Day of the Tentacle, and Indiana Jones and the Fate of Atlantis. Pixel art made of large, flat colour areas with crisp hard edges. No anti-aliasing, no gradients, no dithering, no noise or grain texture, no blur, no glow, no bloom, no lens effects. No text, letters, numbers, signage, logos, or watermarks anywhere; signs and boards are blank. Slightly exaggerated cartoon proportions and bold, readable silhouettes. A flat, top-down, hand-drawn sepia map of Western Europe on aged paper, from Britain to southern Italy, with coastlines, a few mountain ranges and seas, and three small round markers at London, Zurich, and Sorrento. No route line, no labels. Wide landscape image, used whole at 2:1: Britain in the upper left, the Alps in the middle, and the tip of southern Italy in the lower right, with the three markers well inside the frame. Flat as printed paper, with no light source: the paper is one flat parchment colour with a few flat, hard-edged darker patches, no stains, grain, or texture. The sea is a slightly darker flat tan, coastlines are single crisp brown lines, and mountains are small flat brown chevrons. No compass rose, no grid lines, no dashed borders, no cartouche, no decorations. Match the reference image's pixel density, outline style, shading steps, and level of detail exactly. Only the place, palette, light, and contents change.

## For Codex

- Generate exactly 6 images with the built-in image tool: one call per image, the prompt above passed exactly as written each time, `transparent_background: false`, and `referenced_image_paths` set to these files as absolute paths inside `../rgp-codex/`: `assets-src/refs/style-anchor@8x.png`.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to `assets-src/exchange/raw/travel-map-bg/NN.png` (`01` to `06`), append the exact prompt text and anything that went wrong to `assets-src/exchange/raw/travel-map-bg/NOTES.md`, and write an empty `assets-src/exchange/raw/travel-map-bg/DONE` last.
- Replace an image once only if it has visible lettering or numbers, pictures hung in the areas the prompt keeps bare, people, or the wrong subject.
