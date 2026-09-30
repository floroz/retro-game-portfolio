# Portrait-faithful character rig

Rebuild with `npm run assets:rigcut -- --preview assets-src/review/portrait-rig`,
then `npm run assets:rig -- --parts assets-src/character-rig --density 4`.
`scripts/assets/portrait-rig.ts` slices and places the generated artwork without
the legacy tube repaint. The rig retains walking in four directions, breathing,
blinking, three speech mouth shapes, and reach/use animations.

After user feedback on the first assembly, front/back are cut from the complete
`turnaround.png` so shoulders, sleeves and legs share one coherent drawing.
The density-4 atlas and render surface retain facial detail; the figure remains
72 logical pixels tall. The source sheets for the first assembly are retained
alongside the turnaround for provenance; only the revised cutouts ship.

Generated with the built-in image generation tool on 2026-09-30. The user approved the front sheet and requested implementation; side and back extend that design. Canonical identity reference: `src/assets/daniele-static.png` and the user-provided original portrait. Preserve the original face, broad sweater, dark denim, and natural proportions.

## front

Use case: identity-preserve. Create a production animation cutout atlas on true transparent background for the SAME man as these two original reference images. Reference 1 is the canonical portrait face and sweater; reference 2 is the original full body, use it for build, trousers and shoes. Preserve the recognizable face extremely closely: dark brown short swept-up hair, close neatly trimmed dark beard, brown eyes, warm light olive skin, big friendly toothy smile, broad natural shoulders. Navy textured knitted crewneck sweater with thin white undershirt collar, dark desaturated blue jeans, brown shoes. Detailed late-1990s painted pixel-art shading matching the original. NO black cartoon outline, NO skinny elongated cartoon proportions, NO light blue trousers, NO giant beard. This is a FRONT facing puppet asset sheet with detached body parts, NOT a assembled character. It will be animated with skeletal joints.
Canvas 1536 by 1024, organized EXACTLY into 6 columns by 2 rows of equal 256x512 cells, invisible grid. Each component centered horizontally in its own cell; plenty of transparent separation. No labels, no borders, no ground/shadows.
TOP ROW slots left-to-right:

1. isolated front facing head including small neck stub, normal friendly toothy smile.
2. identical head, open mouth speaking A.
3. identical head, rounded mouth speaking O.
4. identical head, slightly open speaking consonant.
5. identical head, eyes closed blinking with original smile.
6. front facing torso ONLY from neck hole to sweater hem; no head, no arms, no legs; wide shoulders natural broad fit matching original, small white collar visible.
   BOTTOM ROW left-to-right:
7. right upper arm navy sweater sleeve shoulder to elbow, vertical hanging orientation, softly rounded overlapping joint caps, no black seam.
8. right forearm sleeve from elbow down through relaxed natural hand; vertical hanging orientation.
9. left upper arm shoulder to elbow.
10. left forearm sleeve and relaxed hand.
11. one front-facing upper trouser leg hip to just below knee, dark denim.
12. one front-facing lower trouser leg knee through brown shoe, shoe subtly angled outward.
    All heads identical scale/position within their cells. Parts should have natural generous widths from the source person. All clothing has matching light from upper left, subtle pixel-textured painted fabric. Actual alpha transparency around each fully detached part. No additional art.

## side

Use case: identity-preserve. Make the RIGHT-FACING PROFILE version of the approved front-facing cutout puppet sheet in reference 1. Reference 2 is the canonical original person. Same man, identical dark swept-up short hair, short tidy beard, natural friendly smiling face, navy knitted sweater, thin white collar, dark muted blue denim, brown shoes. Preserve this identity and softly textured pixel-painted style very closely. No thick black outlines, no cartoon skinny limbs.
Make a truly transparent PNG sprite sheet, with NO backdrop, no glow, no ground, no shadows, no labels. Exactly 6 detached components across each of TWO rows, each fully separated by clear space. Each part vertical, for skeletal animation. Art fills canvas.
Top row: five identical heads all facing directly RIGHT in profile (normal smiling, open A mouth, round O mouth, slightly open consonant mouth, closed-eyes blink). Head includes neck stub only, no shoulder. Last sixth slot: side-profile TORSO ONLY neck to sweater hem, no head, arms or legs; narrower depth than front chest, no sleeve shapes baked into torso.
Bottom row left to right: near upper-arm navy sleeve shoulder-to-elbow with soft rounded overlap caps; near forearm elbow to relaxed hand; far upper-arm matching; far forearm and hand matching; one upper trouser leg hip to knee; one lower leg knee through brown shoe pointing RIGHT.
Exactly 12 isolated pieces. Same painted pixel texture, palette and clothing as reference 1. Natural substantial sleeve widths. All heads identical size and aligned height. Transparent gutters. Canvas 1536x1024.

## back

Use case: identity-preserve. Generate the BACK VIEW cutout puppet parts for the identical man in reference 1 (approved front sheet) and reference 2 (canonical original fullbody). Same dark brown short hair, close tidy haircut at nape, navy textured knitted crewneck sweater, small white undershirt collar, dark desaturated blue jeans and brown shoes. Natural broad build, matching pixel-painted detailed 1990s game style. NO heavy black outlines.
TRUE TRANSPARENT background, no scenery/glow/ground/shadows/borders/labels.
Canvas 1536x1024 organized as EIGHT detached pieces in 4 columns by 2 rows. All parts face directly away from viewer, vertical hanging orientations, fully separated.
TOP ROW:
1 back of head hair crown through nape, ears both visible, small neck stub, no face.
2 BACK TORSO ONLY from neck to hem, no head and NO ARMS: vest-shaped silhouette ending at shoulder sockets at the top corners then narrowing slightly to waist. Broad back, sweater ribbed hem and subtle folds. No sleeves hanging beside it.
3 rear-view right upper-arm sweater sleeve shoulder to elbow, soft rounded joint overlap caps.
4 rear-view left upper-arm sweater sleeve shoulder to elbow.
BOTTOM ROW:
1 rear-view right forearm sleeve elbow to natural relaxed hand.
2 rear-view left forearm sleeve elbow to natural relaxed hand.
3 one rear-view upper trouser leg waist to below knee, subtle back pocket, dark denim.
4 one rear-view lower trouser leg knee through brown shoe seen from the HEEL, foot pointing away.
All parts isolated, color and texture exactly match front reference. No duplicate limbs, exactly eight parts. No skinny cartoon anatomy.

## Torso separation pass

Use case: precise-object-edit. Extract/repaint just the sweater TORSO panels from these three approved sprite sheets for skeletal animation. Preserve the identical man's navy knitted sweater, pixel-painted texture, thin white collar, folds and ribbed hem. This is a technical cutout sheet, not a new costume. The original arm sleeves will be composited separately.
Three isolated torso panels only, evenly spaced horizontally on TRUE TRANSPARENT background:
LEFT front torso, MIDDLE right-facing side torso, RIGHT back torso.
CRITICAL: remove ALL arms and sleeves from every panel. The torso outline is a sleeveless trunk, wide at the shoulders with short diagonally sloped shoulder caps and recessed armholes, then sides taper gently toward the sweater hem. NO cylindrical arm shapes, NO cuffs at the sides. NO bare skin arms. Just fabric trunk. Front and back each have shoulder width about 0.8x trunk height, waist width 0.65x trunk height. Side depth about 0.5x trunk height. White collar at the neck, empty transparent neck hole with NO skin or neck sticking out. No heads, legs, hands or other objects. Sweater fabric blue-black, NEVER a vest garment with buttons, just the existing crewneck's body layer.
All three panels same height. 1536x1024 canvas. Original pixelated painted texture. No black outline, no glow, no backdrop, no grid/labels. Actual alpha background.

## Complete front/back anatomy correction

Use case: identity-preserve. Reference 1 is the APPROVED face and navy knitted sweater identity. Reference 2 is the ORIGINAL character build and clothing. Create a full-body character turnaround with TWO complete assembled figures on actual TRANSPARENT background. LEFT straight-on FRONT, RIGHT straight-on BACK. Both same size, perfectly upright, soles level. Use entire height with small margins, canvas 1536x1024.
The man must look almost exactly like original reference: friendly smiling face, swept-up dark short hair, close trimmed beard, navy knitted crewneck sweater with thin white undershirt collar, dark muted blue straight jeans, brown leather shoes. Retain face detail and the painted pixel-art shading. NO black cartoon outlines.
CRITICAL ANATOMY: draw each as one coherent natural human body, not assembled doll pieces. Normal broad sloping shoulders, smooth sleeves hanging down from shoulders with NO puffy shoulder pads or lumps at elbow. Relaxed almost straight arms hang along sides with small visible gaps from waist, hands end mid upper thigh. Hands relaxed, no gestures, no hands on hips. Full sleeves to wrists. Natural broad sweater not skinny. Legs comfortably separated: centers of feet about shoulder-width apart, both legs entirely visible with a clean continuous air gap from below crotch to soles, feet flat. Knees straight with NO hard seams or bulky cutout edges, jeans straight all the way to shoes. Front knees and toes face forward, back shows heels.
Match front/back proportions exactly, not a narrow squeezed rear silhouette. Head about 1/6 full height. NO ground, no background, no labels/grid, no shadow, no props. This complete neutral stance is an animation rig source and must be anatomically clean and symmetric. Front expression same friendly toothy smile as approved reference.
