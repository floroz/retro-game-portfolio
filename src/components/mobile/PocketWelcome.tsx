import { PROFILE } from "../../config/profile";
import { POCKET_ART } from "./pocketAssets";
import styles from "./PocketAdventure.module.scss";

export function PocketWelcome() {
  return (
    <div className={styles.welcome} data-e2e="pocket-welcome">
      <div className={styles.welcomeHeading}>
        <p className={styles.eyebrow}>A portfolio by {PROFILE.name}</p>
        <p className={styles.edition}>THE POCKET EDITION</p>
      </div>
      <div className={styles.welcomeArt}>
        <img
          src={POCKET_ART.day}
          fetchPriority="high"
          alt="Daniele at his kitchen table overlooking Ischia and the Gulf of Naples"
        />
        <img className={styles.welcomeRest} src={POCKET_ART.restDay} alt="" />
        <span className={styles.postmark}>
          SORRENTO
          <br />
          ADMIT ONE
        </span>
      </div>
      <div className={styles.invitation}>
        <h1>
          A little adventure.
          <br />A bigger world.
        </h1>
        <p className={styles.desktopRecommendation}>
          <strong>The full game is on desktop.</strong> For all the locations,
          characters and discoveries, I recommend visiting on a computer. That’s
          where the whole adventure comes to life.
        </p>
        <p className={styles.mobileDescription}>
          On your phone? Come in for a coffee and a pocket-sized look at my
          work.
        </p>
        <a className={styles.enter} href="#pocket-home">
          Enter Pocket Adventure <span aria-hidden="true">→</span>
        </a>
        <p className={styles.quickLabel}>
          Or go straight to the important stuff
        </p>
        <nav
          className={styles.welcomeLinks}
          aria-label="Quick portfolio access"
        >
          <a href="#pocket-experience">Experience</a>
          <a href="#pocket-resume">Resume</a>
          <a href="#pocket-contact">Contact</a>
        </nav>
        <p className={styles.desktopAddress}>
          The full adventure awaits at{" "}
          <span>
            {new URL(PROFILE.seo.siteUrl).hostname.replace(/^www\./, "")}
          </span>
        </p>
      </div>
    </div>
  );
}
