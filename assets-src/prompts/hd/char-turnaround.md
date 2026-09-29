---
asset: char-turnaround@hd
task: HC1
candidates: 4
references: [assets-src/refs/hd/char-turnaround-current.png]
output: assets-src/exchange/raw/char-turnaround@hd/
transparent_background: true
---

## Prompt

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A character turnaround sheet for the hero of an adventure game, on a transparent background: exactly three full-length figures of the same man in one row, left to right, a front view, a side view facing right, and a back view. The reference is a pixel-art sprite of this man: repaint him as a Curse of Monkey Island cartoon character, still clearly the same man, with the same colouring and outfit. Short brown hair, a full brown beard, a navy crew-neck sweater with a thin white T-shirt collar showing at the neck, blue denim jeans clearly lighter and bluer than the sweater, and brown shoes. Cartoon proportions: the head is about one quarter to one fifth of his height (about 1/4.5), with bigger hands and feet, a friendly, expressive face, and a confident, slightly exaggerated silhouette. A neutral standing pose: arms hanging relaxed and slightly away from the torso so the hands and the gap under each arm are clear, legs straight and a little apart. All three figures are at exactly the same scale and height, with the soles of the shoes on one shared baseline, each figure from the top of the hair to the soles fully in frame with nothing cropped, evenly spaced, never touching or overlapping. No ground, no floor line, no shadow, no motion lines, no background scenery.

## For Codex

- Generate exactly 4 images with the built-in image tool: one call per image, the prompt above passed exactly as written each time, `transparent_background: true`, and `referenced_image_paths` set to these files, in this order, as absolute paths inside `../rgp-codex/`: `assets-src/refs/hd/char-turnaround-current.png`. Every reference must exist before you start; if one is missing, stop and report it rather than generating without it.
- If the tool rejects `transparent_background: true` or returns an opaque background, set it to `false` and, in the prompt, replace "on a transparent background" with "on a flat, solid, pure magenta (#FF00FF) background"; use that text for every remaining image and record the change in `NOTES.md`. Near-magenta (such as `#FA03FA`) is fine: Opus keys it.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to `assets-src/exchange/raw/char-turnaround@hd/NN.png` (`01` to `04`), append the exact prompt text and anything that went wrong to `assets-src/exchange/raw/char-turnaround@hd/NOTES.md`, and write an empty `assets-src/exchange/raw/char-turnaround@hd/DONE` last.
- Replace an image once only for a background that's neither transparent nor flat magenta (a gradient, a scene, a floor, or a shadow), figures that touch, overlap, or are cropped, a number of figures other than three, figures at different scales, visible text, pixel-art or 3D rendering, or the wrong subject.
