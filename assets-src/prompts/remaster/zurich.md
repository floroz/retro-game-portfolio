---
asset: zurich-bg@2x
task: RC1
candidates: 4
references: [assets-src/refs/remaster/zurich-current@4x.png]
output: assets-src/exchange/raw/zurich-bg@2x/
transparent_background: false
---

## Prompt

Remastered 1990s LucasArts point-and-click adventure game art, in the hand-crafted style of The Curse of Monkey Island, rendered as crisp, high-detail pixel art. Hard pixel edges, no anti-aliasing, no blur, no glow, no bloom, no lens effects, no painterly brushwork. Rich but restrained shading with 3 to 6 steps per material, and fine material detail. No text, letters, numbers, signage, logos, or watermarks anywhere; signs and boards are blank. Slightly exaggerated cartoon proportions and bold, readable silhouettes. This is a remastered redraw of the reference image, a finished adventure-game scene. Keep its composition exactly: every object's position, size, and silhouette, the colours, the light, and the mood. Redraw it sharper and more detailed, at twice the resolution. Areas that are bare in the reference stay bare. The room is empty of people. Scene: an office at night overlooking Lake Zurich and the Alps, lit by a warm green desk lamp and cool moonlight through the window. Keep these areas bare exactly as in the reference: the striped plum wallpaper on the upper left, between the left edge and the window, stays plain wallpaper with no frames, pictures, certificates, or shelves; the CRT screen is dark and blank; the card on the filing cabinet's top drawer is a plain blank panel; the door's frosted pane is flat and blank. The cuckoo clock's dial has simple hands and no numerals. The oval rug, the plank floor, and the open floor in front of the desk stay uncluttered. The navy desk chair may be redrawn a little lighter and bluer so it reads against the dark floor.

## For Codex

- Generate exactly 4 images with the built-in image tool: one call per image, the prompt above passed exactly as written each time, `transparent_background: false`, and `referenced_image_paths` set to these files, in this order, as absolute paths inside `../rgp-codex/`: `assets-src/refs/remaster/zurich-current@4x.png`. Every reference must exist before you start; if one is missing, stop and report it rather than generating without it.
- The tool saves to `~/.codex/generated_images/`. Copy each image unchanged to `assets-src/exchange/raw/zurich-bg@2x/NN.png` (`01` to `04`), append the exact prompt text and anything that went wrong to `assets-src/exchange/raw/zurich-bg@2x/NOTES.md`, and write an empty `assets-src/exchange/raw/zurich-bg@2x/DONE` last.
- Replace an image once only if it has visible lettering or numbers, pictures, frames, or props painted into the areas the prompt keeps bare, people, a layout that clearly departs from the first reference, or the wrong subject.
