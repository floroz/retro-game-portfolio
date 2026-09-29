import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./SceneDebugOverlay.module.scss";
import { COUNTRY_ORDER } from "../../config/sections";
import { NATIVE_H, NATIVE_W } from "../../engine/constants";
import { getEngine, images } from "../../engine/runtime";
import type { Hit } from "../../engine/SceneEngine";
import { SCENES } from "../../engine/scenes";
import { sceneWarnings } from "../../engine/validate";
import type {
  Rect,
  SceneData,
  SceneId,
  StandPoint,
  Vec,
} from "../../engine/types";

const SCENE_IDS: SceneId[] = ["hall", "london", "zurich", "sorrento"];

const FACING: Record<StandPoint["facing"], Vec> = {
  n: [0, -5],
  s: [0, 5],
  e: [5, 0],
  w: [-5, 0],
};

const COLOURS = {
  walkbox: "#7fae52",
  depth: "#466394",
  object: "#e0b040",
  exit: "#ff5fd2",
  slot: "#ff9f3a",
  baseline: "#ff4040",
  label: "#6fd0ff",
  entry: "#ffffff",
  actor: "#00ffff",
};

function Standpoint({ p, colour }: { p: StandPoint; colour: string }) {
  const [dx, dy] = FACING[p.facing];
  return (
    <g stroke={colour} fill={colour}>
      <circle cx={p.x} cy={p.y} r={1.2} />
      <line x1={p.x} y1={p.y} x2={p.x + dx} y2={p.y + dy} strokeWidth={0.6} />
    </g>
  );
}

function Tag({
  x,
  y,
  text,
  colour,
}: {
  x: number;
  y: number;
  text: string;
  colour: string;
}) {
  return (
    <text x={x} y={y} fill={colour} className={styles.tag}>
      {text}
    </text>
  );
}

function Box({
  r,
  colour,
  dashed,
}: {
  r: Rect;
  colour: string;
  dashed?: boolean;
}) {
  return (
    <rect
      x={r.x}
      y={r.y}
      width={r.w}
      height={r.h}
      fill="none"
      stroke={colour}
      strokeWidth={0.5}
      strokeDasharray={dashed ? "1.5 1" : undefined}
    />
  );
}

interface Props {
  scene: SceneData;
  hits: Hit[];
}

/**
 * Dev-only scene overlay, enabled with `?debug=scene` under `npm run dev`.
 * Draws walkboxes, hotspots, interaction points, baselines, slot positions,
 * label anchors, entry points, and depth lines over the scene, in native px.
 * The HUD shows the cursor and Daniele's feet in native px, and jumps to any
 * scene or plays the travel map.
 */
export function SceneDebugOverlay({ scene, hits }: Props) {
  const [visible, setVisible] = useState(true);
  const [cursor, setCursor] = useState<Vec | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [hudAtBottom, setHudAtBottom] = useState(false);
  const [actor, setActor] = useState<{ p: StandPoint; scale: number } | null>(
    null,
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const info = useSyncExternalStore(images.subscribe, images.getInfo);

  // Live actor position, about ten times a second.
  useEffect(() => {
    const id = window.setInterval(() => {
      const e = getEngine();
      setActor({ p: e.position, scale: e.scale });
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  // Cursor position in native px, without blocking clicks.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * NATIVE_W;
      const y = ((e.clientY - r.top) / r.height) * NATIVE_H;
      setCursor(
        x >= 0 && y >= 0 && x < NATIVE_W && y < NATIVE_H
          ? [Math.floor(x), Math.floor(y)]
          : null,
      );
    };
    // Shift-click copies the point as "[x, y]", ready for a walkbox.
    const onClick = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!e.shiftKey || !svg) return;
      const r = svg.getBoundingClientRect();
      const x = Math.floor(((e.clientX - r.left) / r.width) * NATIVE_W);
      const y = Math.floor(((e.clientY - r.top) / r.height) * NATIVE_H);
      if (x < 0 || y < 0 || x >= NATIVE_W || y >= NATIVE_H) return;
      const text = `[${x}, ${y}]`;
      void navigator.clipboard?.writeText(text).catch(() => {});
      setCopied(text);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick, true);
    };
  }, []);

  const baselines: { id: string; y: number; x0: number; x1: number }[] = [];
  for (const o of [...scene.objects, ...scene.exits]) {
    if (o.baselineY === undefined) continue;
    const hit = hits.find(
      (h) =>
        (h.target.kind === "object" && h.target.object === o) ||
        (h.target.kind === "exit" && h.target.exit === o),
    );
    const r = hit?.rect;
    baselines.push({
      id: o.id,
      y: o.baselineY,
      x0: r ? r.x : 0,
      x1: r ? r.x + r.w : NATIVE_W,
    });
  }
  for (const a of scene.animations ?? []) {
    if (a.baselineY !== undefined) {
      baselines.push({ id: a.id, y: a.baselineY, x0: a.x, x1: a.x + 16 });
    }
  }
  for (const row of scene.slots ?? []) {
    if (row.baselineY === undefined) continue;
    const xs = row.positions.map((p) => p[0]);
    baselines.push({
      id: row.id,
      y: row.baselineY,
      x0: Math.min(...xs),
      x1: Math.max(...xs) + 8,
    });
  }

  const { depth } = scene;
  const warnings = sceneWarnings(scene, SCENES);

  return (
    <>
      {visible && (
        <svg
          ref={svgRef}
          className={styles.overlay}
          viewBox={`0 0 ${NATIVE_W} ${NATIVE_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polygon
            points={scene.walkbox.map((p) => p.join(",")).join(" ")}
            fill={COLOURS.walkbox}
            fillOpacity={0.12}
            stroke={COLOURS.walkbox}
            strokeWidth={0.5}
          />
          {[
            [depth.farY, `far ${depth.farScale}`],
            [depth.nearY, `near ${depth.nearScale}`],
          ].map(([y, t]) => (
            <g key={String(t)}>
              <line
                x1={0}
                x2={NATIVE_W}
                y1={Number(y)}
                y2={Number(y)}
                stroke={COLOURS.depth}
                strokeWidth={0.4}
                strokeDasharray="2 2"
              />
              <Tag
                x={1}
                y={Number(y) - 1}
                text={String(t)}
                colour={COLOURS.depth}
              />
            </g>
          ))}

          {(scene.slots ?? []).flatMap((row) => {
            const size = info(`slot:slot-${row.kind}`);
            return row.positions.map(([x, y], i) => (
              <g key={`${row.id}-${i}`}>
                <Box
                  r={{ x, y, w: size?.w ?? 8, h: size?.h ?? 8 }}
                  colour={COLOURS.slot}
                  dashed
                />
                <Tag
                  x={x + 0.5}
                  y={y + 3.5}
                  text={String(i)}
                  colour={COLOURS.slot}
                />
              </g>
            ));
          })}

          {hits.map((hit) => {
            const colour =
              hit.target.kind === "exit"
                ? COLOURS.exit
                : hit.target.kind === "slot"
                  ? COLOURS.slot
                  : COLOURS.object;
            const id =
              hit.target.kind === "object"
                ? hit.target.object.id
                : hit.target.kind === "exit"
                  ? `${hit.target.exit.id} → ${hit.target.exit.to}`
                  : null;
            const ip =
              hit.target.kind === "object"
                ? hit.target.object.interactionPoint
                : hit.target.kind === "exit"
                  ? hit.target.exit.interactionPoint
                  : undefined;
            return (
              <g key={`${hit.target.kind}-${hit.rect.x}-${hit.rect.y}-${id}`}>
                {hit.target.kind !== "slot" && (
                  <Box r={hit.rect} colour={colour} />
                )}
                {id && (
                  <Tag
                    x={hit.rect.x + 0.5}
                    y={hit.rect.y + 3.5}
                    text={id}
                    colour={colour}
                  />
                )}
                {ip && <Standpoint p={ip} colour={colour} />}
              </g>
            );
          })}

          {baselines.map((b) => (
            <g key={`base-${b.id}`}>
              <line
                x1={b.x0}
                x2={b.x1}
                y1={b.y}
                y2={b.y}
                stroke={COLOURS.baseline}
                strokeWidth={0.6}
              />
              <Tag
                x={b.x0}
                y={b.y + 4}
                text={`${b.id} ${b.y}`}
                colour={COLOURS.baseline}
              />
            </g>
          ))}

          {(scene.labels ?? []).map((l) => (
            <g key={`label-${l.id}`} stroke={COLOURS.label} strokeWidth={0.5}>
              <line x1={l.x - 2} x2={l.x + 2} y1={l.y} y2={l.y} />
              <line x1={l.x} x2={l.x} y1={l.y - 2} y2={l.y + 2} />
            </g>
          ))}

          {Object.entries(scene.entryPoints).map(([key, p]) => (
            <g key={`entry-${key}`}>
              <Standpoint p={p} colour={COLOURS.entry} />
              <Tag x={p.x + 2} y={p.y - 2} text={key} colour={COLOURS.entry} />
            </g>
          ))}

          {actor && (
            <g stroke={COLOURS.actor} strokeWidth={0.5}>
              <line
                x1={actor.p.x - 4}
                x2={actor.p.x + 4}
                y1={actor.p.y}
                y2={actor.p.y}
              />
              <line
                x1={actor.p.x}
                x2={actor.p.x}
                y1={actor.p.y - 4}
                y2={actor.p.y + 1}
              />
            </g>
          )}
        </svg>
      )}

      <div
        className={`${styles.hud} ${hudAtBottom ? styles.bottom : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <strong>{scene.id}</strong>
          {cursor ? ` · cursor ${cursor[0]},${cursor[1]}` : ""}
          {actor
            ? ` · feet ${Math.round(actor.p.x)},${Math.round(actor.p.y)} ${actor.p.facing} ×${actor.scale.toFixed(2)}`
            : ""}
        </div>
        <div>
          shift-click copies [x, y]{copied ? ` · copied ${copied}` : ""}
        </div>
        {warnings.map((w) => (
          <div key={w} className={styles.warning}>
            ⚠ {w}
          </div>
        ))}
        <div className={styles.buttons}>
          {SCENE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => getEngine().jumpTo(id)}
            >
              {id}
            </button>
          ))}
          {COUNTRY_ORDER.map((id) => (
            <button
              key={`map-${id}`}
              type="button"
              onClick={() => getEngine().previewMap(id)}
            >
              map→{id}
            </button>
          ))}
          <button type="button" onClick={() => setVisible((v) => !v)}>
            {visible ? "hide" : "show"} overlay
          </button>
          <button type="button" onClick={() => setHudAtBottom((b) => !b)}>
            move HUD
          </button>
        </div>
      </div>
    </>
  );
}
