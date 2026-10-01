/** Reduce the generated working kit to the game's painted pixel grid. */
import sharp from "sharp";
import { writePng } from "./lib";
import { finishPainted } from "./painted";

const data = await sharp("assets-src/approved/inspection-skills.png")
  .resize(640, 320, { fit: "fill", kernel: "lanczos3" })
  .ensureAlpha()
  .raw()
  .toBuffer();
await writePng(
  "src/assets/inspections/skills.png",
  finishPainted({ width: 640, height: 320, data: new Uint8ClampedArray(data) })
    .image,
);
