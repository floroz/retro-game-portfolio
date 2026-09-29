---
task: HC3
references: [assets-src/refs/hd/char-turnaround-approved.png]
transparent_background: true
items:
  - asset: char-heads-side@hd
    candidates: 3
    output: assets-src/exchange/raw/char-heads-side@hd/
  - asset: char-heads-front@hd
    candidates: 3
    output: assets-src/exchange/raw/char-heads-front@hd/
---

Two head sheets for the talk and blink variants, one per facing that talks (side and front). Each has its own prompt below; the references and settings are the same for both.

## Prompt: char-heads-side@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A head sheet for a cut-out puppet, on a transparent background: exactly five copies of the head of the man in the reference turnaround, in side view facing right, in one row, evenly spaced, never touching. Exactly the same man, painting style, colours, and scale as the side view's head in the reference, each head with the beard and the same short neck stub. The five heads are identical in size, outline, hair, beard, and position, and differ only in the mouth and eyes, left to right: mouth closed in a relaxed neutral expression; mouth open, talking; mouth wide open, as in an excited shout; mouth rounded into an O; and a blink, with the eyes closed and the mouth closed. The mouth shapes are clearly readable through the beard. No bodies, no speech marks, no guides, no shadows.

## Prompt: char-heads-front@hd

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. A head sheet for a cut-out puppet, on a transparent background: exactly five copies of the head of the man in the reference turnaround, in front view facing the viewer, in one row, evenly spaced, never touching. Exactly the same man, painting style, colours, and scale as the front view's head in the reference, each head with the beard and the same short neck stub. The five heads are identical in size, outline, hair, beard, and position, and differ only in the mouth and eyes, left to right: mouth closed in a relaxed neutral expression; mouth open, talking; mouth wide open, as in an excited shout; mouth rounded into an O; and a blink, with the eyes closed and the mouth closed. The mouth shapes are clearly readable through the beard. No bodies, no speech marks, no guides, no shadows.

## For Codex

- **Wait for the reference.** `assets-src/refs/hd/char-turnaround-approved.png` is created at gate HG1. If it doesn't exist yet, stop and report it; never generate without it.
- For each item above, generate exactly 3 images with the built-in image tool: one call per image, that item's prompt passed exactly as written each time, `transparent_background: true`, and `referenced_image_paths` set to the absolute path of `assets-src/refs/hd/char-turnaround-approved.png` inside `../rgp-codex/`.
- If the tool rejects `transparent_background: true` or returns an opaque background, set it to `false` and, in the prompt, replace "on a transparent background" with "on a flat, solid, pure magenta (#FF00FF) background"; use that text for every remaining image and record the change in that item's `NOTES.md`.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to the item's output folder as `NN.png` (`01` to `03`): `assets-src/exchange/raw/char-heads-side@hd/` and `assets-src/exchange/raw/char-heads-front@hd/`. In each folder, append the exact prompt text and anything that went wrong to `NOTES.md`, and write an empty `DONE` last.
- Replace an image once only for a number of heads other than five, heads at different sizes or that touch, mouth shapes in the wrong order or indistinguishable, a background that's neither transparent nor flat magenta, a man who doesn't match the reference, visible text, pixel-art or 3D rendering, or the wrong subject.
