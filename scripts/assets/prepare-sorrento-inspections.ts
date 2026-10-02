/** Prepare generated Sorrento story props without repainting the room. */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { readImage, writePng } from "./lib";
import { finishPainted, fixedColoursFrom } from "./painted";

const before = "assets-src/refs/hd/sorrento-before-inspections.png";
const original = await readImage(before);
const palette = fixedColoursFrom([original]);
const generated = await sharp("assets-src/approved/sorrento-story-objects.png")
  .resize(640, 320, { fit: "fill", kernel: "lanczos3" })
  .ensureAlpha()
  .raw()
  .toBuffer();
const edited = finishPainted(
  { width: 640, height: 320, data: new Uint8ClampedArray(generated) },
  { fixed: palette, colours: palette.length },
).image;

// Copy only the generated postcard and address-book regions. The original
// sea, floor, lighting and furniture contact shadows stay pixel-identical.
for (const rect of [
  { x: 103, y: 102, width: 56, height: 26 },
  { x: 432, y: 82, width: 68, height: 23 },
]) {
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    const start = (y * 640 + rect.x) * 4;
    const end = start + rect.width * 4;
    original.data.set(edited.data.subarray(start, end), start);
  }
}
await writePng("src/assets/scenes/sorrento/bg.png", original);

const provenancePath = "assets-src/provenance/sorrento-bg.json";
const provenance: Record<string, unknown> = JSON.parse(
  readFileSync(provenancePath, "utf8"),
);
Object.assign(provenance, {
  task: "sorrento-story-inspections",
  prompt: "assets-src/prompts/hd/sorrento-inspections.md",
  references: [before],
  approvedRaw: "assets-src/approved/sorrento-story-objects.png",
  date: "2026-09-30",
  cleanup:
    "Built-in imagegen edited a postcard onto the fridge and an address book above the telephone. scripts/assets/prepare-sorrento-inspections.ts copies only two generated crops after resizing and remapping to the existing 256-colour scene palette. All pixels outside the two crops are unchanged, including the original HB4 furniture contact shadows and floor contrast treatment. The original scene is preserved in assets-src/refs/hd/sorrento-before-inspections.png.",
});
writeFileSync(provenancePath, JSON.stringify(provenance, null, 2) + "\n");
