---
asset: char-idle-s@2x
task: RC7
candidates: 3
references:
  [
    assets-src/refs/remaster/char-idle-s-current@8x.png,
    assets-src/refs/remaster/char-turnaround@4x.png,
  ]
output: assets-src/exchange/raw/char-idle-s@2x/
transparent_background: false
---

## Prompt

Remastered 1990s LucasArts point-and-click adventure game art, in the hand-crafted style of The Curse of Monkey Island, rendered as crisp, high-detail pixel art. Hard pixel edges, no anti-aliasing, no blur, no glow, no bloom, no lens effects, no painterly brushwork. Rich but restrained shading with 3 to 6 steps per material, and fine material detail. No text, letters, numbers, signage, logos, or watermarks anywhere; signs and boards are blank. Slightly exaggerated cartoon proportions and bold, readable silhouettes. A remastered redraw of the reference sprite sheet, on a flat, solid, pure magenta (#FF00FF) background: the same man, the same poses in the same order and layout, the same proportions and outfit, redrawn with sharper, more detailed pixel art at twice the resolution. No ground shadow, no motion lines. 3 figures in one row, read left to right, exactly as in the first reference: standing idle facing the viewer: neutral, slight breath in, eyes closed (blink). Match the second reference, the remastered turnaround, for the face, beard, outfit, pixel density, and level of detail. Short brown hair, full brown beard, a navy crew-neck sweater with a thin white T-shirt collar showing at the neck, blue denim jeans clearly lighter and bluer than the sweater, and brown shoes. Every figure is full length, from the top of the hair to the soles of the shoes, with nothing cropped, and the head is about one fifth of the body height, as in the reference. Figures are evenly spaced, the same height, with feet on one shared baseline, and never touch or overlap. Hard-edged shading with a dark selective outline; no soft airbrushed shading and no knit texture.

## For Codex

- Generate exactly 3 images with the built-in image tool: one call per image, the prompt above passed exactly as written each time, `transparent_background: false`, and `referenced_image_paths` set to these files, in this order, as absolute paths inside `../rgp-codex/`: `assets-src/refs/remaster/char-idle-s-current@8x.png`, `assets-src/refs/remaster/char-turnaround@4x.png`. Every reference must exist before you start; if one is missing, stop and report it rather than generating without it.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to `assets-src/exchange/raw/char-idle-s@2x/NN.png` (`01` to `03`), append the exact prompt text and anything that went wrong to `assets-src/exchange/raw/char-idle-s@2x/NOTES.md`, and write an empty `assets-src/exchange/raw/char-idle-s@2x/DONE` last.
- A near-magenta background (for example `#FA03FA`, or slight drift towards the corners) is fine: Opus keys it in OKLab. Replace an image once only for a visible gradient or shadow in the background, figures that touch or overlap, a different number of figures from the reference, visible text, or the wrong subject.
