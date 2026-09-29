/**
 * Pure checks behind `npm run lint:assets` (validate.ts): shipped asset
 * naming, provenance records, and the character sheet JSON. Kept apart from
 * validate.ts so they can be unit tested without touching the file system.
 */
import {
  LOGICAL_SCENE_SIZE,
  characterMetrics,
  characterTags,
  isSceneId,
  type CharacterSheetJson,
  type Density,
  type SceneId,
} from "./lib";

/**
 * Every density a shipped asset may have: 1 (the original art), 2 (the Phase
 * R remaster), and 4 (Phase H's hand-painted HD art, 1280x640 scenes). All
 * three are valid while scenes move to HD one at a time. `lib.ts` (read-only)
 * knows only the pixel-art densities, 1 and 2.
 */
export const ASSET_DENSITIES = [1, 2, 4] as const;
export type AssetDensity = (typeof ASSET_DENSITIES)[number];

export function isAssetDensity(value: unknown): value is AssetDensity {
  return (ASSET_DENSITIES as readonly unknown[]).includes(value);
}

/**
 * HD (density 4) art is painted, with no palette and soft edges, so it skips
 * the palette, ramp, and hard-alpha rules. Naming, provenance, sizes, and
 * one density per scene folder still apply.
 */
export function usesPixelRules(density: AssetDensity): boolean {
  return density !== 4;
}

/** Native scene size at a density: 320x160, 640x320, or 1280x640. */
export function nativeSceneSize(density: AssetDensity): {
  w: number;
  h: number;
} {
  return {
    w: LOGICAL_SCENE_SIZE.w * density,
    h: LOGICAL_SCENE_SIZE.h * density,
  };
}

/** Folders whose images ship and must pass the validator. */
export const SHIPPED_ROOTS = [
  "src/assets/scenes",
  "src/assets/shared",
  "src/assets/character",
] as const;

const KEBAB = "[a-z0-9]+(?:-[a-z0-9]+)*";
const SCENE_FILE = new RegExp(
  `^(bg|fg|obj-${KEBAB}(?:@${KEBAB})?|anim-${KEBAB})\\.png$`,
);
const SLOT_FILE = new RegExp(`^slot-${KEBAB}\\.png$`);
const SHARED_FILE = new RegExp(`^${KEBAB}\\.png$`);

export type AssetKind =
  | "bg"
  | "fg"
  | "obj"
  | "anim"
  | "slot"
  | "shared"
  | "character"
  | "rig";

export interface ShippedAsset {
  path: string;
  /** Asset id from the art spec's naming rules, e.g. zurich-obj-door@open. */
  id: string;
  kind: AssetKind;
  /** Scene whose ramp the asset may use; null means the core only. */
  scene: SceneId | null;
}

/**
 * Classify a shipped file by its repo-relative path. Returns an error string
 * when the path breaks the naming rules, or null for files that aren't images
 * the validator handles (daniele.json is checked separately).
 */
export function classifyAsset(path: string): ShippedAsset | string | null {
  const parts = path.split("/");
  const file = parts[parts.length - 1];

  if (path.startsWith("src/assets/scenes/")) {
    if (parts.length !== 5)
      return `${path}: scene assets live directly in src/assets/scenes/<scene>/`;
    const scene = parts[3];
    if (!isSceneId(scene)) return `${path}: unknown scene "${scene}"`;
    if (!SCENE_FILE.test(file)) {
      return `${path}: scene files are bg.png, fg.png, obj-<id>.png, obj-<id>@<state>.png, or anim-<id>.png (kebab-case)`;
    }
    const stem = file.slice(0, -4);
    const kind: AssetKind =
      stem === "bg"
        ? "bg"
        : stem === "fg"
          ? "fg"
          : stem.startsWith("obj-")
            ? "obj"
            : "anim";
    return { path, id: `${scene}-${stem}`, kind, scene };
  }

  if (path.startsWith("src/assets/shared/")) {
    const inSlots = parts[3] === "slots";
    if (inSlots && parts.length !== 5)
      return `${path}: slot sprites live directly in src/assets/shared/slots/`;
    if (inSlots && !SLOT_FILE.test(file))
      return `${path}: slot sprites are named slot-<kind>.png (kebab-case)`;
    if (!inSlots && !SHARED_FILE.test(file))
      return `${path}: shared sprites are kebab-case .png files`;
    return {
      path,
      id: file.slice(0, -4),
      kind: inSlots ? "slot" : "shared",
      scene: null,
    };
  }

  if (path.startsWith("src/assets/character/")) {
    if (file === "daniele.json" || file === "daniele-rig.json") return null;
    if (path === "src/assets/character/daniele.png")
      return { path, id: "char-sheet", kind: "character", scene: null };
    if (path === "src/assets/character/daniele-rig.png")
      return { path, id: "char-rig", kind: "rig", scene: null };
    return `${path}: the character folder holds only daniele.png, daniele.json, daniele-rig.png, and daniele-rig.json`;
  }

  return `${path}: not under ${SHIPPED_ROOTS.join(", ")}`;
}

/**
 * Size rules per kind, at the asset's density (from its provenance record;
 * 1 when it has none). Returns error strings.
 */
export function checkAssetSize(
  asset: ShippedAsset,
  width: number,
  height: number,
  density: AssetDensity = 1,
): string[] {
  const scene = nativeSceneSize(density);
  const at = density === 1 ? "" : ` at density ${density}`;
  if (
    (asset.kind === "bg" || asset.kind === "fg") &&
    (width !== scene.w || height !== scene.h)
  ) {
    return [
      `${asset.path}: ${asset.kind} must be ${scene.w}x${scene.h}${at}, is ${width}x${height}`,
    ];
  }
  if (
    (asset.kind === "obj" || asset.kind === "anim") &&
    (width > scene.w || height > scene.h)
  ) {
    return [
      `${asset.path}: larger than the ${scene.w}x${scene.h} scene${at} (${width}x${height})`,
    ];
  }
  if (asset.kind === "rig" && density !== 4)
    return [`${asset.path}: the cut-out rig is HD art, density 4`];
  if (asset.kind === "character" && density === 4)
    return [
      `${asset.path}: the HD character is the cut-out rig (daniele-rig.png), not a density 4 sheet`,
    ];
  return [];
}

/**
 * Every image in one scene folder shares a density: a scene switches to 2x
 * (Phase R) or HD (Phase H) all at once. Takes each asset with its density.
 */
export function checkSceneDensities(
  assets: readonly { asset: ShippedAsset; density: AssetDensity }[],
): string[] {
  const byScene = new Map<string, Map<AssetDensity, string[]>>();
  for (const { asset, density } of assets) {
    if (!asset.path.startsWith("src/assets/scenes/") || !asset.scene) continue;
    const scene = byScene.get(asset.scene) ?? new Map<AssetDensity, string[]>();
    scene.set(density, [...(scene.get(density) ?? []), asset.path]);
    byScene.set(asset.scene, scene);
  }
  const errors: string[] = [];
  for (const [scene, densities] of byScene) {
    if (densities.size < 2) continue;
    const parts = [...densities]
      .sort(([a], [b]) => a - b)
      .map(([d, paths]) => `density ${d}: ${paths.join(", ")}`);
    errors.push(
      `src/assets/scenes/${scene}: mixes densities; move the whole scene at once (${parts.join("; ")})`,
    );
  }
  return errors;
}

// --- Provenance ----------------------------------------------------------------------

export interface ProvenanceRecord {
  id: string;
  output: string;
  task: string;
  source: "codex" | "opus";
  palette?: string;
  prompt?: string;
  candidate?: string;
  references?: string[];
  approvedRaw?: string;
  derivedFrom?: string;
  cleanup?: string;
  approvedBy?: string;
  /** Absent means 1. Remastered (Phase R) assets have 2, HD (Phase H) ones 4. */
  density?: AssetDensity;
  date: string;
}

/**
 * The density a provenance record declares: its "density" field, or 1 when
 * it has none or the field is invalid (checkProvenance reports that).
 */
export function provenanceDensity(record: unknown): AssetDensity {
  if (typeof record !== "object" || record === null) return 1;
  const d = (record as { density?: unknown }).density;
  return isAssetDensity(d) ? d : 1;
}

const isString = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;

/**
 * Check one record against assets-src/provenance/schema.json. `fileName` is
 * the record's file name, which must be `<id>.json`. `exists` tells whether a
 * repo-relative path exists.
 */
export function checkProvenance(
  value: unknown,
  fileName: string,
  exists: (path: string) => boolean,
): string[] {
  const where = `assets-src/provenance/${fileName}`;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [`${where}: not a JSON object`];
  }
  const r = value as Record<string, unknown>;
  const errors: string[] = [];
  const need = (key: string) => {
    if (!isString(r[key])) errors.push(`${where}: "${key}" is required`);
  };
  ["id", "output", "task", "source", "date"].forEach(need);
  if (isString(r.id)) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:@[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(r.id)
    ) {
      errors.push(`${where}: id "${r.id}" isn't kebab-case`);
    }
    if (fileName !== `${r.id}.json`)
      errors.push(`${where}: file must be named ${r.id}.json`);
  }
  if (isString(r.date) && !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
    errors.push(`${where}: date must be YYYY-MM-DD`);
  }
  if (
    r.palette !== undefined &&
    !(isString(r.palette) && /^v\d+$/.test(r.palette))
  ) {
    errors.push(`${where}: palette must look like "v1"`);
  }
  if (r.source !== undefined && r.source !== "codex" && r.source !== "opus") {
    errors.push(`${where}: source must be "codex" or "opus"`);
  }
  if (r.source === "codex") {
    ["prompt", "candidate", "approvedRaw"].forEach(need);
    if (!Array.isArray(r.references) || !r.references.every(isString)) {
      errors.push(
        `${where}: codex assets need a "references" array (it may be empty)`,
      );
    }
  }
  if (r.source === "opus") {
    for (const key of ["prompt", "candidate", "approvedRaw"]) {
      if (r[key] !== undefined)
        errors.push(`${where}: "${key}" is only for codex assets`);
    }
  }
  if (r.density !== undefined && !isAssetDensity(r.density)) {
    errors.push(
      `${where}: density must be one of ${ASSET_DENSITIES.join(", ")} (a number)`,
    );
  }
  if (
    r.density === 2 &&
    r.source === "codex" &&
    isString(r.approvedRaw) &&
    !r.approvedRaw.endsWith("@2x.webp")
  ) {
    errors.push(
      `${where}: a density 2 codex asset's approved raw is assets-src/approved/<id>@2x.webp, not ${r.approvedRaw}`,
    );
  }
  for (const key of ["derivedFrom", "cleanup", "approvedBy"]) {
    if (r[key] !== undefined && !isString(r[key]))
      errors.push(`${where}: "${key}" must be a string`);
  }
  const paths = [
    r.output,
    r.prompt,
    r.approvedRaw,
    ...(Array.isArray(r.references) ? r.references : []),
  ];
  for (const p of paths) {
    if (isString(p) && !exists(p)) errors.push(`${where}: ${p} doesn't exist`);
  }
  return errors;
}

// --- Character sheet ---------------------------------------------------------------------

/**
 * Check daniele.json against its sheet at `density` (from the char-sheet
 * provenance record; default 1): tags, frame counts, cell sizes, and origin.
 */
export function checkCharacterJson(
  value: unknown,
  sheet: { width: number; height: number },
  density: Density = 1,
): string[] {
  const where = "src/assets/character/daniele.json";
  if (typeof value !== "object" || value === null)
    return [`${where}: not a JSON object`];
  const json = value as Partial<CharacterSheetJson>;
  const errors: string[] = [];
  if (
    !json.size ||
    json.size.w !== sheet.width ||
    json.size.h !== sheet.height
  ) {
    errors.push(
      `${where}: size doesn't match daniele.png (${sheet.width}x${sheet.height})`,
    );
  }
  if (typeof json.stride !== "number" || json.stride <= 0)
    errors.push(`${where}: stride must be positive`);
  const frames = json.frames ?? [];
  frames.forEach((f, i) => {
    if (
      f.x < 0 ||
      f.y < 0 ||
      f.x + f.w > sheet.width ||
      f.y + f.h > sheet.height
    ) {
      errors.push(`${where}: frame ${i} falls outside the sheet`);
    }
  });
  if ((json.density ?? 1) !== density) {
    errors.push(
      `${where}: density ${String(json.density ?? 1)} doesn't match the char-sheet provenance record's density ${density}`,
    );
  }
  for (const [tag, spec] of Object.entries(characterTags(density))) {
    const t = json.tags?.[tag];
    if (!t) {
      errors.push(`${where}: missing tag ${tag}`);
      continue;
    }
    const count = t.to - t.from + 1;
    if (count !== spec.frames)
      errors.push(`${where}: ${tag} has ${count} frames, needs ${spec.frames}`);
    for (let i = t.from; i <= t.to; i++) {
      const f = frames[i];
      if (!f || f.w !== spec.cell.w || f.h !== spec.cell.h) {
        errors.push(
          `${where}: ${tag} frame ${i - t.from} isn't ${spec.cell.w}x${spec.cell.h}`,
        );
        break;
      }
    }
  }
  const { origin } = characterMetrics(density);
  if (
    json.origin &&
    (json.origin.x !== origin.x || json.origin.y !== origin.y)
  ) {
    errors.push(`${where}: origin must be (${origin.x}, ${origin.y})`);
  }
  return errors;
}
