import { useEffect, useRef, useState } from "react";
import styles from "./Toolbar.module.scss";
import { useGameStore } from "../../store/gameStore";
import { PROFILE } from "../../config/profile";
import { COUNTRIES, SECTIONS, isCountryScene } from "../../config/sections";
import type { Rect, SectionId } from "../../engine/types";
import { PANEL_LAYOUT, panelPct, type UtilityId } from "./layout";
import {
  CANVAS_PANEL_H,
  CANVAS_PANEL_W,
  paintPanel,
  type ControlId,
  type PanelView,
} from "./paint";
import { IDLE_SENTENCE, controlSentence, sentenceText } from "./sentence";

const UTILITY_RECTS = Object.fromEntries(
  PANEL_LAYOUT.utilities.map((u) => [u.id, u.rect]),
) as Record<UtilityId, Rect>;

/**
 * The controls under the scene: a travel trunk painted on the scenes' own
 * 2x grid (layout.ts, paint.ts). The sentence line runs along its top; one
 * boarding pass per city carries the sections that live there, so the
 * trunk teaches the mapping (docs/expansion-plan.md, "How visitors know
 * where each section is"); brass fittings hold Talk, Sound, GitHub, and
 * LinkedIn.
 *
 * The art is one canvas. Over it sit real buttons and links, one per
 * control, for the pointer, the keyboard, and screen readers. Every
 * section is one click from anywhere: Daniele walks to the nearest exit,
 * flies to the section's city, and the content opens on arrival; a click
 * during the trip skips straight to the content.
 */
export function Toolbar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<ControlId | null>(null);
  const [pressed, setPressed] = useState<ControlId | null>(null);

  const hoveredObject = useGameStore((s) => s.hoveredObject);
  const skippable = useGameStore((s) => s.skippable);
  const flyingTo = useGameStore((s) => s.flyingTo);
  const currentScene = useGameStore((s) => s.currentScene);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const setHoveredObject = useGameStore((s) => s.setHoveredObject);
  const goToSection = useGameStore((s) => s.goToSection);
  const openDialog = useGameStore((s) => s.openDialog);
  const toggleSound = useGameStore((s) => s.toggleSound);

  // While the travel map plays, the destination's ticket is stamped already.
  const here = flyingTo ?? (isCountryScene(currentScene) ? currentScene : null);
  const sentence = sentenceText({ hoveredObject, skippable, flyingTo });

  useEffect(() => {
    const view: PanelView = {
      here,
      hovered,
      pressed,
      sentence,
      idle: sentence === IDLE_SENTENCE,
      soundEnabled,
    };
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) paintPanel(ctx, view);
  }, [here, hovered, pressed, sentence, soundEnabled]);

  /** Hover and focus both light the control and fill the sentence line. */
  const pointAt = (id: ControlId) => ({
    onMouseEnter: () => {
      setHovered(id);
      setHoveredObject(controlSentence(id, soundEnabled));
    },
    onMouseLeave: () => {
      setHovered(null);
      setPressed(null);
      setHoveredObject(null);
    },
    onFocus: () => {
      setHovered(id);
      setHoveredObject(controlSentence(id, soundEnabled));
    },
    onBlur: () => {
      setHovered(null);
      setHoveredObject(null);
    },
    onPointerDown: () => setPressed(id),
    onPointerUp: () => setPressed(null),
  });

  const openSection = (section: SectionId) => {
    const { terminalScreenAction, terminalOpen, gameWindowActive } =
      useGameStore.getState();
    // Ignore clicks while content is open, or while another window has focus.
    if (terminalScreenAction) return;
    if (terminalOpen && !gameWindowActive) return;
    goToSection(section);
  };

  const onSound = () => {
    toggleSound();
    // The hover line follows the new state.
    setHoveredObject(controlSentence("sound", !soundEnabled));
  };

  const utilityProps = (id: UtilityId) => ({
    className: styles.fitting,
    style: panelPct(UTILITY_RECTS[id]),
    "data-e2e": "toolbar-button",
    "data-control": id,
    "aria-label": controlSentence(id, soundEnabled),
    ...pointAt(id),
  });

  return (
    <div className={styles.panel} data-e2e="toolbar">
      <canvas
        ref={canvasRef}
        className={styles.art}
        width={CANVAS_PANEL_W}
        height={CANVAS_PANEL_H}
        aria-hidden="true"
      />

      <p className={styles.sentence} data-e2e="toolbar-status">
        {sentence}
      </p>

      {PANEL_LAYOUT.tickets.map(({ country, rows }) => {
        const city = COUNTRIES[country].name;
        const isHere = country === here;
        return (
          <div
            key={country}
            role="group"
            aria-label={isHere ? `${city} (you are here)` : city}
            data-e2e="toolbar-ticket"
            data-country={country}
            data-here={isHere}
          >
            {rows.map(({ section, rect }) => {
              const where = controlSentence(section);
              return (
                <button
                  key={section}
                  type="button"
                  className={styles.row}
                  style={panelPct(rect)}
                  data-e2e="toolbar-button"
                  data-section={section}
                  data-country={SECTIONS[section].home}
                  data-here={isHere}
                  aria-label={isHere ? `${where} (you are here)` : where}
                  onClick={() => openSection(section)}
                  {...pointAt(section)}
                />
              );
            })}
          </div>
        );
      })}

      <button
        type="button"
        {...utilityProps("talk")}
        onClick={() => openDialog("intro")}
      />
      <button
        type="button"
        {...utilityProps("sound")}
        aria-pressed={soundEnabled}
        aria-label="Sound"
        onClick={onSound}
      />
      <a
        {...utilityProps("github")}
        href={PROFILE.social.github}
        target="_blank"
        rel="noopener noreferrer"
      />
      <a
        {...utilityProps("linkedin")}
        href={PROFILE.social.linkedin}
        target="_blank"
        rel="noopener noreferrer"
      />
    </div>
  );
}
