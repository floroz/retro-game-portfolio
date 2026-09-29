---
asset: char-turnaround@2x
task: RC1
candidates: 4
references: [assets-src/refs/remaster/char-turnaround-current@8x.png]
output: assets-src/exchange/raw/char-turnaround@2x/
transparent_background: false
---

## Prompt

Remastered 1990s LucasArts point-and-click adventure game art, in the hand-crafted style of The Curse of Monkey Island, rendered as crisp, high-detail pixel art. Hard pixel edges, no anti-aliasing, no blur, no glow, no bloom, no lens effects, no painterly brushwork. Rich but restrained shading with 3 to 6 steps per material, and fine material detail. No text, letters, numbers, signage, logos, or watermarks anywhere; signs and boards are blank. Slightly exaggerated cartoon proportions and bold, readable silhouettes. A remastered redraw of the reference sprite sheet, on a flat, solid, pure magenta (#FF00FF) background: the same man, the same poses in the same order and layout, the same proportions and outfit, redrawn with sharper, more detailed pixel art at twice the resolution. No ground shadow, no motion lines. Exactly three figures in one row, left to right, as in the reference: front view, side view facing right, and back view, in a neutral standing pose with the arms hanging relaxed at the sides, clear of the torso. Short brown hair, full brown beard, a navy crew-neck sweater with a thin white T-shirt collar showing at the neck, blue denim jeans clearly lighter and bluer than the sweater, and brown shoes. Every figure is full length, from the top of the hair to the soles of the shoes, with nothing cropped, and the head is about one fifth of the body height, as in the reference. Figures are evenly spaced, the same height, with feet on one shared baseline, and never touch or overlap. Hard-edged shading with a dark selective outline; no soft airbrushed shading and no knit texture.

## For Codex

- Generate exactly 4 images with the built-in image tool: one call per image, the prompt above passed exactly as written each time, `transparent_background: false`, and `referenced_image_paths` set to these files, in this order, as absolute paths inside `../rgp-codex/`: `assets-src/refs/remaster/char-turnaround-current@8x.png`. Every reference must exist before you start; if one is missing, stop and report it rather than generating without it.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to `assets-src/exchange/raw/char-turnaround@2x/NN.png` (`01` to `04`), append the exact prompt text and anything that went wrong to `assets-src/exchange/raw/char-turnaround@2x/NOTES.md`, and write an empty `assets-src/exchange/raw/char-turnaround@2x/DONE` last.
- A near-magenta background (for example `#FA03FA`, or slight drift towards the corners) is fine: Opus keys it in OKLab. Replace an image once only for a visible gradient or shadow in the background, figures that touch or overlap, a different number of figures from the reference, visible text, or the wrong subject.
