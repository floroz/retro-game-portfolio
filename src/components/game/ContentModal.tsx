import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ActionType } from "../../types/game";
import { PROFILE } from "../../config/profile";
import styles from "./ContentModal.module.scss";

interface ContentModalProps {
  isOpen: boolean;
  action: ActionType | null;
  onClose: () => void;
}

function getContent(action: ActionType): { title: string; content: string } {
  switch (action) {
    case "experience":
      return {
        title: "Work Experience",
        content: PROFILE.experienceSummary,
      };
    case "projects": {
      const projectsList = PROFILE.projects
        .map((p) => `${p.emoji} ${p.name} - ${p.description}\n   ${p.tech}`)
        .join("\n\n");
      return {
        title: "Projects",
        content: `Featured Projects:\n\n${projectsList}\n\n[More projects on GitHub]`,
      };
    }
    case "skills":
      return {
        title: "Technical Skills",
        content: `Frontend:
${PROFILE.skills.frontend.map((s) => `• ${s}`).join("\n")}

Backend:
${PROFILE.skills.backend.map((s) => `• ${s}`).join("\n")}

AI & Developer Tools:
${PROFILE.skills.ai.map((s) => `• ${s}`).join("\n")}

Cloud & DevOps:
${PROFILE.skills.cloud.map((s) => `• ${s}`).join("\n")}

Data & Infrastructure:
${PROFILE.skills.data.map((s) => `• ${s}`).join("\n")}

Testing:
${PROFILE.skills.testing.map((s) => `• ${s}`).join("\n")}

Leadership & Process:
${PROFILE.skills.leadership.map((s) => `• ${s}`).join("\n")}`,
      };
    case "about":
      return {
        title: `About ${PROFILE.name.split(" ")[0]}`,
        content: PROFILE.bio,
      };
    case "contact": {
      const interests = PROFILE.contactInterests
        .map((i) => `• ${i}`)
        .join("\n");
      return {
        title: "Contact",
        content: `Let's connect!

📧 Email: ${PROFILE.email}
💼 LinkedIn: ${PROFILE.social.linkedin}
🐙 GitHub: ${PROFILE.social.github}
📍 Location: ${PROFILE.location}

I'm always open to discussing:
${interests}`,
      };
    }
    case "resume":
      return {
        title: "Resume",
        content: `Download my resume to learn more about my experience and qualifications.

${PROFILE.name}
${PROFILE.title}
${PROFILE.location}

[PDF Download Button]

Or view the online version with interactive elements.

[Online Resume Link]`,
      };
    case "talk":
      // "talk" action opens dialog, not modal - this case should never be reached
      return {
        title: "",
        content: "",
      };
  }
}

/**
 * Full-screen content overlay styled like a new "room"
 * Slides in from right with retro border styling
 */
export function ContentModal({ isOpen, action, onClose }: ContentModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isOpen]);

  const content = action ? getContent(action) : null;

  return (
    <AnimatePresence>
      {isOpen && content && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal content - centered with fade animation */}
          <motion.div
            className={styles.modal}
            data-e2e="modal"
            ref={contentRef}
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.header}>
              <h2 className={styles.title} data-e2e="modal-title">
                {content.title}
              </h2>
              <button
                className={styles.close}
                onClick={onClose}
                aria-label="Close"
                type="button"
              >
                [X]
              </button>
            </div>

            <div className={styles.body}>
              <pre className={styles.content} data-e2e="modal-content">
                {content.content}
              </pre>
            </div>

            <div className={styles.footer}>
              <button className={styles.button} onClick={onClose} type="button">
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
