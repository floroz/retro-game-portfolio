import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PROFILE } from "../../config/profile";
import {
  POCKET_CONVERSATION,
  POCKET_HOTSPOTS,
  POCKET_SECTIONS,
} from "../../config/pocketAdventure";
import type { SectionId } from "../../engine/types";
import { PocketReading } from "./PocketReading";
import { PocketScene } from "./PocketScene";
import { usePocketAmbience } from "./usePocketAmbience";
import { PocketWelcome } from "./PocketWelcome";
import styles from "./PocketAdventure.module.scss";

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function currentRoute(): SectionId | "home" | "welcome" {
  return (
    POCKET_SECTIONS.find(({ id }) => window.location.hash === `#pocket-${id}`)
      ?.id ?? (window.location.hash === "#pocket-home" ? "home" : "welcome")
  );
}

/** A pixel speaker, crossed out while muted. */
function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="22"
      height="22"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path fill="currentColor" d="M1 5h3l4-4h1v14H8l-4-4H1z" />
      {muted ? (
        <path
          fill="currentColor"
          d="M10 5h2v2h-2zM14 5h2v2h-2zM12 7h2v2h-2zM10 9h2v2h-2zM14 9h2v2h-2z"
        />
      ) : (
        <path
          fill="currentColor"
          d="M11 6h1v4h-1zM13 4h1v8h-1zM15 2h1v12h-1z"
        />
      )}
    </svg>
  );
}

/** A small adventure that never puts the portfolio behind a game mechanic. */
export function PocketAdventure() {
  const route = useSyncExternalStore(
    subscribe,
    currentRoute,
    () => "welcome" as const,
  );
  const section = route === "home" || route === "welcome" ? null : route;
  const [sipRequest, setSipRequest] = useState(0);
  const ambience = usePocketAmbience(route === "home");
  const [conversation, setConversation] = useState<
    keyof typeof POCKET_CONVERSATION | null
  >(null);
  const reading = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const talk = useRef<HTMLButtonElement>(null);
  const previousSection = useRef(section);

  useEffect(() => {
    if (section) {
      reading.current?.scrollTo(0, 0);
      reading.current?.focus({ preventScroll: true });
    } else if (previousSection.current) {
      opener.current?.focus({ preventScroll: true });
    }
    previousSection.current = section;
  }, [section]);

  if (route === "welcome") {
    return (
      <main className={`${styles.adventure} ${styles.welcomeMode}`}>
        <PocketWelcome />
      </main>
    );
  }

  return (
    <main className={styles.adventure} data-e2e="pocket-adventure">
      <div className={styles.world} hidden={section !== null}>
        <div className={styles.stage}>
          <div
            className={styles.scene}
            data-e2e="pocket-scene"
            role="group"
            aria-label="Daniele's kitchen overlooking Ischia. Tap the painted objects to explore the portfolio."
          >
            <PocketScene active={section === null} sipRequest={sipRequest} />
            {POCKET_HOTSPOTS.map((hotspot) => (
              <a
                key={hotspot.section}
                className={styles.hotspot}
                href={`#pocket-${hotspot.section}`}
                aria-label={hotspot.label}
                style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                onClick={(event) => {
                  opener.current = event.currentTarget;
                }}
              />
            ))}
            <button
              ref={talk}
              type="button"
              className={styles.hotspot}
              style={{ left: "24%", top: "49%" }}
              aria-label={`Talk to ${PROFILE.name.split(" ")[0]}`}
              onClick={() => setConversation("greeting")}
            />
          </div>
          {conversation && (
            <div
              className={styles.conversation}
              aria-label={`Conversation with ${PROFILE.name.split(" ")[0]}`}
            >
              <p className={styles.speaker}>{PROFILE.name.split(" ")[0]}</p>
              <p aria-live="polite">{POCKET_CONVERSATION[conversation]}</p>
              <div className={styles.choices}>
                <button type="button" onClick={() => setConversation("work")}>
                  What do you do?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConversation("coffee");
                    setSipRequest(sipRequest + 1);
                  }}
                >
                  Coffee?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConversation(null);
                    talk.current?.focus();
                  }}
                >
                  See you!
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {section && (
        <article
          ref={reading}
          tabIndex={-1}
          className={styles.reading}
          aria-label={`${POCKET_SECTIONS.find(({ id }) => id === section)?.label} content`}
          data-e2e="pocket-reading"
          onKeyDown={(event) => {
            if (event.key === "Escape") window.location.hash = "pocket-home";
          }}
        >
          <PocketReading section={section} />
        </article>
      )}

      <nav className={styles.navigation} aria-label="Portfolio">
        {POCKET_SECTIONS.map(({ id, label }) => (
          <a
            key={id}
            href={`#pocket-${id}`}
            aria-current={section === id ? "page" : undefined}
            onClick={(event) => {
              opener.current = event.currentTarget;
            }}
          >
            {label}
          </a>
        ))}
        <a
          href="#pocket-home"
          aria-current={section === null ? "page" : undefined}
        >
          Explore
        </a>
        <button
          type="button"
          className={styles.sound}
          aria-label={ambience.enabled ? "Mute sound" : "Enable sound"}
          aria-pressed={ambience.enabled}
          title={ambience.enabled ? "Mute sound" : "Enable sound"}
          onClick={ambience.toggle}
        >
          <SoundIcon muted={!ambience.enabled} />
        </button>
      </nav>
    </main>
  );
}
