/**
 * `npm run lint:assets` (docs/art-spec.md, How an asset gets made, step 6).
 *
 * Fails if any shipped asset is off-palette, uses another scene's ramp, has
 * partial alpha, is the wrong size, is badly named, or has no provenance
 * record. Also checks the palette files, every provenance record, and the
 * character sheet JSON.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  PALETTE_PATH,
  PROVENANCE_DIR,
  REPO_ROOT,
  checkImagePalette,
  loadPalette,
  readImage,
  toGpl,
  type Palette,
} from "./lib";
import {
  SHIPPED_ROOTS,
  checkAssetSize,
  checkCharacterJson,
  checkProvenance,
  classifyAsset,
  type ShippedAsset,
} from "./checks";

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const rel = (p: string) => relative(REPO_ROOT, p).split("\\").join("/");

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
  for (const asset of assets) {
    const img = await readImage(resolve(REPO_ROOT, asset.path));
    sizes.set(asset.path, { w: img.width, h: img.height });
    errors.push(...checkAssetSize(asset, img.width, img.height));
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
    if (asset.kind === "bg") {
      const transparent = img.data.some((v, i) => i % 4 === 3 && v !== 255);
      if (transparent)
        errors.push(`${asset.path}: bg.png must be fully opaque`);
    }
    if (!byOutput.has(asset.path)) {
      errors.push(
        `${asset.path}: no provenance record in assets-src/provenance/ (expected ${asset.id}.json)`,
      );
    }
    if (asset.kind === "character") {
      const jsonPath = resolve(REPO_ROOT, "src/assets/character/daniele.json");
      if (!existsSync(jsonPath))
        errors.push("src/assets/character/daniele.json is missing");
      else {
        errors.push(
          ...checkCharacterJson(
            JSON.parse(readFileSync(jsonPath, "utf8")) as unknown,
            img,
          ),
        );
      }
    }
  }

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

  if (errors.length) {
    for (const e of errors) console.error(`error: ${e}`);
    console.error(`\nlint:assets failed with ${errors.length} error(s).`);
    process.exit(1);
  }
  console.log(
    `lint:assets: ${assets.length} assets and ${byOutput.size} provenance records OK (palette ${palette.version}).`,
  );
}

main().catch((e: unknown) => {
  console.error(`error: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
