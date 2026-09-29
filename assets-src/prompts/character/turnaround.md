---
asset: char-turnaround
task: F4
candidates: 6
references: [src/assets/retro-daniele.png, src/assets/daniele-static.png]
output: assets-src/exchange/raw/char-turnaround/
transparent_background: false
---

## Prompt

1990s LucasArts SCUMM point-and-click adventure game art, VGA era, in the style of Monkey Island 2, Day of the Tentacle, and Indiana Jones and the Fate of Atlantis. Pixel art made of large, flat colour areas with crisp hard edges. No anti-aliasing, no gradients, no dithering, no noise or grain texture, no blur, no glow, no bloom, no lens effects. No text, letters, numbers, signage, logos, or watermarks anywhere; signs and boards are blank. Slightly exaggerated cartoon proportions and bold, readable silhouettes. Character turnaround sheet of the same man as the reference images, on a flat, solid, pure magenta (#FF00FF) background with no shadow and no gradient. Front view, side view facing right, and back view, left to right, in a neutral standing pose. Short brown hair, full brown beard, navy crew-neck sweater, blue jeans, brown shoes. Same height, same scale, feet on one shared baseline, figures well apart and not touching. No ground shadow, no glow, no rim light. Exactly three full-length figures, each from the top of the hair to the soles of the shoes with nothing cropped, filling most of the image height. The head is about one fifth of the body height. Arms hang relaxed at the sides. Flat cel shading: every area (hair, skin, sweater, jeans, shoes) is one flat colour with one or two hard-edged shade steps and a dark outline; no soft shading, no fabric texture, no knit pattern.

## For Codex

- Generate exactly 6 images with the built-in image tool: one call per image, the prompt above passed exactly as written each time, `transparent_background: false`, and `referenced_image_paths` set to these files as absolute paths inside `../rgp-codex/`: `src/assets/retro-daniele.png`, `src/assets/daniele-static.png`.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to `assets-src/exchange/raw/char-turnaround/NN.png` (`01` to `06`), append the exact prompt text and anything that went wrong to `assets-src/exchange/raw/char-turnaround/NOTES.md`, and write an empty `assets-src/exchange/raw/char-turnaround/DONE` last.
- A near-magenta background (for example `#FA03FA`, or slight drift towards the corners) is fine: Opus keys it in OKLab. Replace an image once only for a visible gradient or shadow in the background, figures that touch or overlap, visible text, or the wrong subject.
