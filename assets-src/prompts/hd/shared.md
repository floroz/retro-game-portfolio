---
asset: shared-sprites@hd
task: HC4
candidates: 3
references: [assets-src/refs/hd/style-anchor.png]
output: assets-src/exchange/raw/shared-sprites@hd/
transparent_background: true
---

## Prompt

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A sprite sheet of eight separate game props, on a transparent background, painted in the style of the reference scene (match its ink outline weight, shading, and level of detail, but not its room). The props are laid out in two rows of four, each fully separate with a clear gap around it, none touching or overlapping, each seen from the front at a slight three-quarter angle unless stated, and each with no shadow, no floor, and no background. Top row, left to right: a single beer hand-pump for a pub bar, a tall wooden pull handle on a polished brass pump body and base, with a blank oval badge; a small framed photo in a plain wooden frame, its picture an abstract painted impression of a small group of people standing together, loose soft shapes with no faces or detail; a lemon fridge magnet, a small glossy cartoon lemon with a leaf; and a small wooden beer cask on its side with iron hoops. Bottom row, left to right: an open cardboard shoebox full of old photos, their pictures abstract soft shapes; a small untidy pile of mixed fridge magnets (fruit, a tiny moka pot, a little boat); a small airliner seen from directly above, plain white with no livery, pointing to the right; and a round map pin, a glossy red ball head on a short silver pin, seen from the front and slightly above. Every photo and badge is blank or abstract, with no lettering. Compose for a final size of 640×320 pixels: bold, clearly readable shapes and silhouettes, and no tiny detail that would turn to mush at that size.

## For Codex

- **Wait for the reference.** `assets-src/refs/hd/style-anchor.png` is created at gate HG1. If it doesn't exist yet, stop and report it; never generate without it.
- Generate exactly 3 images with the built-in image tool: one call per image, the prompt above passed exactly as written each time, `transparent_background: true`, and `referenced_image_paths` set to these files, in this order, as absolute paths inside `../rgp-codex/`: `assets-src/refs/hd/style-anchor.png`.
- If the tool rejects `transparent_background: true` or returns an opaque background, set it to `false` and, in the prompt, replace "on a transparent background" with "on a flat, solid, pure magenta (#FF00FF) background"; use that text for every remaining image and record the change in `NOTES.md`.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to `assets-src/exchange/raw/shared-sprites@hd/NN.png` (`01` to `03`), append the exact prompt text and anything that went wrong to `assets-src/exchange/raw/shared-sprites@hd/NOTES.md`, and write an empty `assets-src/exchange/raw/shared-sprites@hd/DONE` last.
- Replace an image once only for props that touch or overlap, clearly missing or extra props, a background that's neither transparent nor flat magenta, a room or scene painted behind the props, visible text, pixel-art or 3D rendering, or the wrong subject.
