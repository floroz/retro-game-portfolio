/**
 * `npm run lint:assets` (docs/art-spec.md, How an asset gets made, step 6).
 *
 * Fails if any shipped asset is off-palette, uses another scene's ramp, has
 * partial alpha, is the wrong size, is badly named, or has no provenance
 * record. Also checks the palette files, every provenance record, and the
 * character sheet JSON, and that every file in public/audio/ is named by the
 * art spec's rules and has a provenance record (with loop points for loops).
 *
 * Sizes follow each asset's density, from its provenance record's "density"
 * field (absent means 1), so density-1, remastered density-2, and HD
 * density-4 scenes pass side by side while scenes move one at a time.
 * Density-4 (Phase H) art is painted: it skips the palette, ramp, and
 * hard-alpha rules, but keeps every naming, provenance, size, and
 * one-density-per-scene rule. The HD character is the cut-out rig,
 * daniele-rig.png, checked against daniele-rig.json.
 *
 * Painted density-2 art (Phase H at MI3 pixel density: "density": 2,
 * "style": "painted") also skips the palette and ramp rules, but keeps hard
 * alpha, needs even sprite sides, and may use at most 256 colours per scene
 * folder across all its files (the shared sprites together count as one
 * group, the rig atlas as another). A scene folder can't mix painted and
 * pixel density-2 files either. Density-2 files without a style (or with
 * "pixel") are Phase R pixel art and keep every pixel-art rule.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  PALETTE_PATH,
  PROVENANCE_DIR,
  REPO_ROOT,
  checkImagePalette,
  isSceneId,
  loadPalette,
  readImage,
  toGpl,
  type Palette,
} from "./lib";
import {
  SHIPPED_ROOTS,
  checkAssetOpacity,
  checkAssetSize,
  checkCharacterJson,
  checkPaintedAlpha,
  checkPaintedColours,
  checkProvenance,
  checkSceneDensities,
  classifyAsset,
  isPainted,
  provenanceDensity,
  provenanceStyle,
  usesPixelRules,
  type ShippedAsset,
} from "./checks";
import { visibleColours } from "./painted";
import { checkRigJson } from "./rigpack";

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const rel = (p: string) => relative(REPO_ROOT, p).split("\\").join("/");

/** Shipped audio (docs/art-spec.md, File layout and Audio). */
const AUDIO_ROOT = "public/audio";
const AUDIO_FILE =
  /^public\/audio\/(music|ambience|sfx)\/([a-z0-9]+(?:-[a-z0-9]+)*)\.mp3$/;

/**
 * Check one shipped audio file against its provenance record (undefined when
 * it has none). A loop's record must carry Web Audio loop points.
 */
function checkAudio(
  path: string,
  recordFile: string | undefined,
  record: Record<string, unknown> | undefined,
): string[] {
  const m = AUDIO_FILE.exec(path);
  if (!m) {
    return [
      `${path}: audio files are public/audio/music/<track>.mp3, public/audio/ambience/<scene>.mp3, or public/audio/sfx/<name>.mp3 (kebab-case)`,
    ];
  }
  const [, kind, name] = m;
  const id = `${kind}-${name}`;
  const errors: string[] = [];
  if (kind === "ambience" && !isSceneId(name))
    errors.push(`${path}: unknown scene "${name}"`);
  if (!recordFile || !record) {
    return [
      ...errors,
      `${path}: no provenance record in assets-src/provenance/ (expected ${id}.json)`,
    ];
  }
  if (recordFile !== `${id}.json`)
    errors.push(
      `${path}: its provenance record must be ${id}.json, not ${recordFile}`,
    );
  const loop = record.loop as Record<string, unknown> | undefined;
  if (loop === undefined) {
    if (kind === "ambience")
      errors.push(
        `assets-src/provenance/${recordFile}: an ambience loop needs "loop" points`,
      );
  } else {
    const { loopStart, loopEnd, sampleRate } = loop;
    if (
      typeof loopStart !== "number" ||
      typeof loopEnd !== "number" ||
      typeof sampleRate !== "number" ||
      !(loopStart >= 0 && loopEnd > loopStart)
    ) {
      errors.push(
        `assets-src/provenance/${recordFile}: "loop" needs numeric loopStart < loopEnd (seconds) and sampleRate`,
      );
    }
  }
  return errors;
}

async function main() {
  const errors: string[] = [];
  let palette: Palette;
  try {
    palette = loadPalette();
  } catch (e) {
    console.error(`error: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  const gplPath = resolve(PALETTE_PATH, "../master.gpl");
  if (
    !existsSync(gplPath) ||
    readFileSync(gplPath, "utf8") !== toGpl(palette)
  ) {
    errors.push(
      "assets-src/palette/master.gpl is out of date: run npm run assets:palette",
    );
  }

  // Provenance records, indexed by output.
  const byOutput = new Map<string, string>();
  const records = new Map<string, Record<string, unknown>>();
  const exists = (p: string) => existsSync(resolve(REPO_ROOT, p));
  for (const file of existsSync(PROVENANCE_DIR)
    ? readdirSync(PROVENANCE_DIR)
    : []) {
    if (file === "schema.json" || !file.endsWith(".json")) continue;
    let value: unknown;
    try {
      value = JSON.parse(readFileSync(join(PROVENANCE_DIR, file), "utf8"));
    } catch {
      errors.push(`assets-src/provenance/${file}: invalid JSON`);
      continue;
    }
    errors.push(...checkProvenance(value, file, exists));
    if (typeof value === "object" && value !== null && !Array.isArray(value))
      records.set(file, value as Record<string, unknown>);
    const output = (value as { output?: unknown }).output;
    if (typeof output === "string") {
      const prev = byOutput.get(output);
      if (prev)
        errors.push(`${output}: has two provenance records (${prev}, ${file})`);
      byOutput.set(output, file);
    }
  }

  // Shipped assets.
  const assets: ShippedAsset[] = [];
  for (const root of SHIPPED_ROOTS) {
    for (const full of walk(resolve(REPO_ROOT, root))) {
      const path = rel(full);
      if (path.endsWith("/.gitkeep")) continue;
      const result = classifyAsset(path);
      if (typeof result === "string") errors.push(result);
      else if (result) assets.push(result);
    }
  }

  const sizes = new Map<string, { w: number; h: number }>();
  const recordOf = (path: string) => {
    const file = byOutput.get(path);
    return file ? records.get(file) : undefined;
  };
  const densityOf = (path: string) => provenanceDensity(recordOf(path));
  const styleOf = (path: string) => provenanceStyle(recordOf(path));
  const paintedColours: Parameters<typeof checkPaintedColours>[0][number][] =
    [];
  for (const asset of assets) {
    const img = await readImage(resolve(REPO_ROOT, asset.path));
    const density = densityOf(asset.path);
    const style = styleOf(asset.path);
    sizes.set(asset.path, { w: img.width, h: img.height });
    errors.push(
      ...checkAssetSize(asset, img.width, img.height, density, style),
    );
    if (isPainted(density, style)) {
      errors.push(...checkPaintedAlpha(asset, img));
      paintedColours.push({ asset, colours: visibleColours([img]) });
    }
    if (usesPixelRules(density, style)) {
      const report = checkImagePalette(img, palette, asset.scene);
      const ramp = asset.scene ?? "core only";
      if (report.offPalette.length) {
        errors.push(
          `${asset.path}: off-palette colours ${report.offPalette.slice(0, 8).join(" ")}`,
        );
      }
      if (report.wrongRamp.length) {
        errors.push(
          `${asset.path}: uses colours outside its ramp (${ramp}): ${report.wrongRamp.slice(0, 8).join(" ")}`,
        );
      }
      if (report.partialAlpha)
        errors.push(
          `${asset.path}: ${report.partialAlpha} pixels have partial alpha`,
        );
    }
    errors.push(...checkAssetOpacity(asset, img));
    if (!byOutput.has(asset.path)) {
      errors.push(
        `${asset.path}: no provenance record in assets-src/provenance/ (expected ${asset.id}.json)`,
      );
    }
    if (asset.kind === "rig") {
      const jsonPath = resolve(
        REPO_ROOT,
        "src/assets/character/daniele-rig.json",
      );
      if (!existsSync(jsonPath))
        errors.push("src/assets/character/daniele-rig.json is missing");
      else
        errors.push(
          ...checkRigJson(
            JSON.parse(readFileSync(jsonPath, "utf8")) as unknown,
            img,
            density === 2 ? 2 : 4,
          ),
        );
    }
    if (asset.kind === "character" && density !== 4) {
      const jsonPath = resolve(REPO_ROOT, "src/assets/character/daniele.json");
      if (!existsSync(jsonPath))
        errors.push("src/assets/character/daniele.json is missing");
      else {
        errors.push(
          ...checkCharacterJson(
            JSON.parse(readFileSync(jsonPath, "utf8")) as unknown,
            img,
            density,
          ),
        );
      }
    }
  }

  errors.push(...checkPaintedColours(paintedColours));
  errors.push(
    ...checkSceneDensities(
      assets.map((asset) => ({
        asset,
        density: densityOf(asset.path),
        style: styleOf(asset.path),
      })),
    ),
  );

  // An @state sprite has the same size as its default.
  for (const asset of assets.filter(
    (a) => a.kind === "obj" && a.path.includes("@"),
  )) {
    const base = asset.path.replace(/@[^/]+\.png$/, ".png");
    const a = sizes.get(asset.path);
    const b = sizes.get(base);
    if (!b) errors.push(`${asset.path}: has no default ${base}`);
    else if (a && (a.w !== b.w || a.h !== b.h)) {
      errors.push(`${asset.path}: must match ${base} in size (${b.w}x${b.h})`);
    }
  }

  // Shipped audio: every file in public/audio/ has a provenance record.
  const audio = walk(resolve(REPO_ROOT, AUDIO_ROOT)).map(rel);
  for (const path of audio) {
    if (path.endsWith("/.gitkeep")) continue;
    const recordFile = byOutput.get(path);
    errors.push(
      ...checkAudio(
        path,
        recordFile,
        recordFile ? records.get(recordFile) : undefined,
      ),
    );
  }

  if (errors.length) {
    for (const e of errors) console.error(`error: ${e}`);
    console.error(`\nlint:assets failed with ${errors.length} error(s).`);
    process.exit(1);
  }
  console.log(
    `lint:assets: ${assets.length} images, ${audio.length} audio files, and ${byOutput.size} provenance records OK (palette ${palette.version}).`,
  );
}

main().catch((e: unknown) => {
  console.error(`error: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
