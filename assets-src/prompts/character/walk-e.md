---
asset: char-walk-e
task: C5
candidates: 4
references: [assets-src/refs/char-turnaround@8x.png]
output: assets-src/exchange/raw/char-walk-e/
transparent_background: false
---

## Prompt

1990s LucasArts SCUMM point-and-click adventure game art, VGA era, in the style of Monkey Island 2, Day of the Tentacle, and Indiana Jones and the Fate of Atlantis. Pixel art made of large, flat colour areas with crisp hard edges. No anti-aliasing, no gradients, no dithering, no noise or grain texture, no blur, no glow, no bloom, no lens effects. No text, letters, numbers, signage, logos, or watermarks anywhere; signs and boards are blank. Slightly exaggerated cartoon proportions and bold, readable silhouettes. Sprite sheet on a flat, solid, pure magenta (#FF00FF) background with no shadow and no gradient. 8 figures in 2 rows of 4, read left to right, top to bottom, evenly spaced and not touching. The same character as the reference in every figure, at identical scale, with feet on the same baseline in each row. Walk cycle facing right: contact, down, passing, up, then contact, down, passing, up with the other leg forward. No ground shadow, no motion lines. Every figure faces right, in profile. Every figure is full length, from the top of the hair to the soles of the shoes, with nothing cropped; the head is about one fifth of the body height, as in the reference. Flat cel shading: every area (hair, skin, sweater, jeans, shoes) is one flat colour with one or two hard-edged shade steps and a dark outline; no soft shading, no fabric texture, no knit pattern.

## For Codex

- Generate exactly 4 images with the built-in image tool: one call per image, the prompt above passed exactly as written each time, `transparent_background: false`, and `referenced_image_paths` set to these files as absolute paths inside `../rgp-codex/`: `assets-src/refs/char-turnaround@8x.png`.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to `assets-src/exchange/raw/char-walk-e/NN.png` (`01` to `04`), append the exact prompt text and anything that went wrong to `assets-src/exchange/raw/char-walk-e/NOTES.md`, and write an empty `assets-src/exchange/raw/char-walk-e/DONE` last.
- A near-magenta background (for example `#FA03FA`, or slight drift towards the corners) is fine: Opus keys it in OKLab. Replace an image once only for a visible gradient or shadow in the background, figures that touch or overlap, visible text, or the wrong subject.
