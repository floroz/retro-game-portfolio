# Swiss room: sleeping cow and pendulum

Generated with the built-in imagegen tool on 2026-10-01.

## Cow

Use case: stylized-concept. Create a production game sprite: one sleeping Swiss Simmental cow, full body reclined with legs tucked underneath, face turned slightly toward the viewer and facing right. Warm reddish chestnut brown and creamy white patches, white face, small cream horns, rounded ears, eyes peacefully closed, rosy broad muzzle, red leather collar and a small brass Swiss cowbell. Hand-painted 1990s LucasArts adventure game art, subtle pixel texture, crisp silhouette, softly shaded detailed fur masses, not vector art or 3D. Warm amber light from upper right, soft cool moonlight edge at left. Three-quarter side view, camera looking slightly down as for a point-and-click room foreground. Wide compact low sleeping silhouette, tail tucked near rear. Isolated cutout with genuinely transparent background, no floor, no drop shadow, no scene, no letters, no Zzz (animated separately), no frame. Full cow within canvas with very little transparent padding. Intended display about 270 by 150 pixels in a timber Swiss chalet study.

## Clock wall

Input: `src/assets/remaster/zurich/bg.png` from V2.1, before this change.

Use case: precise-object-edit. Edit target: the attached Swiss chalet game room background. Remove ONLY the small central clock pendulum: the thin vertical rod and round golden bob directly below the clock face at approximately x=894, y=145 through 179 in this 1280x640 image. Fill those pixels with the warm textured beige plaster wall behind it. Keep the two outer hanging chains and pinecone weights (at x877 and x912) completely untouched. Keep the entire rest of the image exactly unchanged, including clock case, clock face, ceiling, timber panelling, frames, window, lake, rug, floor, colors and dimensions. No other edits. The central pendulum is going to be drawn as a moving layer by the game.

## Export

`scripts/assets/swiss-room.ts` trims and fits the cow on an 80x40 logical-pixel transparent canvas, preserving alpha at density 4 and using the existing Zurich palette and hard alpha at density 2. The lower eight logical pixels stay fixed while the upper body breathes.

Only the 24x40-pixel cleaned wall patch at (882,146) is retained from the clock edit. Compositing that small patch preserves every other background pixel. The pendulum and rising Zs are deterministic procedural effects. Run the export after `scripts/assets/remaster-world.ts` when rebuilding the remastered room.
