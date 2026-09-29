/**
 * Pure checks behind `npm run lint:assets` (validate.ts): shipped asset
 * naming, provenance records, and the character sheet JSON. Kept apart from
 * validate.ts so they can be unit tested without touching the file system.
 */
import {
  BODY_CELL,
  CHARACTER_TAGS,
  isSceneId,
  type CharacterSheetJson,
  type SceneId,
} from "./lib";

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
  | "character";

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
    if (file === "daniele.json") return null;
    if (path !== "src/assets/character/daniele.png") {
      return `${path}: the character folder holds only daniele.png and daniele.json`;
    }
    return { path, id: "char-sheet", kind: "character", scene: null };
  }

  return `${path}: not under ${SHIPPED_ROOTS.join(", ")}`;
}

/** Size rules per kind. Returns error strings. */
export function checkAssetSize(
  asset: ShippedAsset,
  width: number,
  height: number,
): string[] {
  if (
    (asset.kind === "bg" || asset.kind === "fg") &&
    (width !== 320 || height !== 160)
  ) {
    return [
      `${asset.path}: ${asset.kind} must be 320x160, is ${width}x${height}`,
    ];
  }
  if (
    (asset.kind === "obj" || asset.kind === "anim") &&
    (width > 320 || height > 160)
  ) {
    return [
      `${asset.path}: larger than the 320x160 scene (${width}x${height})`,
    ];
  }
  return [];
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
  date: string;
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

export function checkCharacterJson(
  value: unknown,
  sheet: { width: number; height: number },
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
  for (const [tag, spec] of Object.entries(CHARACTER_TAGS)) {
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
  if (
    json.origin &&
    (json.origin.x !== BODY_CELL.w / 2 || json.origin.y !== 61)
  ) {
    errors.push(`${where}: origin must be (16, 61)`);
  }
  return errors;
}
