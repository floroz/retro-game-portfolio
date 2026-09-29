---
asset: london-bg@hd
task: HC2
candidates: 4
references:
  [
    assets-src/refs/hd/london-current.png,
    assets-src/refs/hd/scale-sheet.png,
    assets-src/refs/hd/style-anchor.png,
  ]
output: assets-src/exchange/raw/london-bg@hd/
transparent_background: false
---

## Prompt

Hand-painted cartoon adventure-game art in the style of The Curse of Monkey Island (LucasArts, 1997): bold confident dark ink outlines, rich saturated but tasteful colour, painted shading with soft light, slightly exaggerated rounded cartoon forms, high detail, crisp and clean. Not pixel art, not 3D, not photographic. No text, letters, numbers, signage, logos, or watermarks; signs and boards are blank. This is an HD repaint of the first reference, a finished adventure-game scene, as a wide 2:1 landscape. Keep its composition: every object's position and silhouette, the light, and the mood, repainted in full hand-painted detail. The second reference is a scale sheet, not part of the scene: the two grey figures are a person at the front and at the back of the walkable floor, and the grey shapes beside them are a door, a fridge, a table, a chair, and a bar counter at their correct sizes next to the smaller figure. Size every door, piece of furniture, and counter in this scene to match, relative to a person standing where it stands: a person at the back of the floor, where it meets the back wall, is about 36% of the image height tall, and a person at the front edge about 45%. Where the first reference and the scale sheet disagree, the scale sheet wins: keep the object where it stands and centred where it is, and change only its size. Never paint the grey figures, the dashed lines, or the floor line into the scene. Areas that are bare in the reference stay bare. The room is empty of people. No floor, rug, or large surface a person walks in front of is navy or denim blue. The third reference is the approved style anchor: match its painting style, ink outline weight, shading, and level of detail exactly, but not its colours or its room. Scene: a warm London pub on a rainy evening, with dark wood and amber light from brass pendant lamps. Through the window, under a wet grey-blue sky, the City skyline (St Paul's dome, the Gherkin, the Shard) glows with lit windows over the river, with a red phone box and a lamp post on the wet, shining street, which is otherwise empty of vehicles. The rain outside reads as a wet, glistening evening with a few drops beading on the glass, never streaks, a grey haze, or a dense sheet. The bar counter is about 0.6 times the height of a person standing behind it, the green door is a full-height door, and the round table and stools are sized to the scale sheet. Keep these areas bare exactly as in the reference: the big chalkboard between the bottle shelves is a plain dark board with nothing written or drawn on it, and the wooden header strip above it is blank; the long bar top is bare along its whole length, with no beer taps, pumps, or glasses on it; the panelled red wall on the right, below the three small lamps and left of the dartboard, stays plain panelling with no frames or pictures. The phone box and the fruit machine carry no lettering or numbers; the fruit machine's reels show simple fruit shapes only.

## For Codex

- Generate exactly 4 images with the built-in image tool: one call per image, the prompt above passed exactly as written each time, `transparent_background: false`, and `referenced_image_paths` set to these files, in this order, as absolute paths inside `../rgp-codex/`: `assets-src/refs/hd/london-current.png`, `assets-src/refs/hd/scale-sheet.png`, `assets-src/refs/hd/style-anchor.png`. Every reference must exist before you start; if one is missing, stop and report it rather than generating without it. `style-anchor.png` is created at gate HG1, so this prompt can't run before then.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to `assets-src/exchange/raw/london-bg@hd/NN.png` (`01` to `04`), append the exact prompt text and anything that went wrong to `assets-src/exchange/raw/london-bg@hd/NOTES.md`, and write an empty `assets-src/exchange/raw/london-bg@hd/DONE` last.
- Replace an image once only if it has visible lettering or numbers, pictures, frames, taps, or props painted into the areas the prompt keeps bare, people or grey scale-sheet shapes, pixel-art or 3D rendering, a layout that clearly departs from the first reference, or the wrong subject.
