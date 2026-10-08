/**
 * Dialog tree content for the adventure game dialog system
 * Inspired by classic point-and-click adventures (Monkey Island, Day of the Tentacle)
 */

import { PROFILE } from "./profile";
import type { DialogNode } from "../types/game";

export const DIALOG_TREE: Record<string, DialogNode> = {
  // Intro - shown first after welcome screen with typewriter effect
  intro: {
    speaker: "daniele",
    text: `Hey! Welcome to my portfolio. I'm Daniele, a software engineer based in ${PROFILE.location}.`,
    options: [{ id: "continue", label: "Continue...", nextNode: "intro-2" }],
  },

  "intro-2": {
    speaker: "daniele",
    text: "Feel free to explore around. What would you like to know?",
    options: [
      {
        id: "about",
        label: "Tell me about yourself",
        nextNode: "about-intro",
      },
      {
        id: "work",
        label: "What kind of work do you do?",
        nextNode: "work-intro",
      },
      {
        id: "hire",
        label: "Are you available for hire?",
        nextNode: "hire-info",
      },
      { id: "bye", label: "Just browsing, thanks", nextNode: "bye" },
    ],
  },

  // Welcome / Main hub
  welcome: {
    speaker: "daniele",
    text: "What would you like to know?",
    options: [
      {
        id: "about",
        label: "Tell me about yourself",
        nextNode: "about-intro",
      },
      {
        id: "work",
        label: "What kind of work do you do?",
        nextNode: "work-intro",
      },
      {
        id: "hire",
        label: "Are you available for hire?",
        nextNode: "hire-info",
      },
      { id: "bye", label: "Just browsing, thanks", nextNode: "bye" },
    ],
  },

  // About branch
  "about-intro": {
    speaker: "daniele",
    text: "Plot twist: I have two Psychology degrees from Federico II in Naples. Turns out users are worth studying.",
    options: [
      { id: "continue", label: "Continue...", nextNode: "about-intro-2" },
    ],
  },

  "about-intro-2": {
    speaker: "daniele",
    text: PROFILE.journey,
    options: [
      {
        id: "about-more",
        label: "Tell me more about your approach",
        nextNode: "about-details",
      },
      {
        id: "about-hobbies",
        label: "Any hobbies?",
        nextNode: "about-hobbies",
      },
      {
        id: "back",
        label: "Let's talk about something else",
        nextNode: "welcome",
      },
    ],
  },

  "about-details": {
    speaker: "daniele",
    text: "My psychology background drives my focus on human experience. Now I'm full-stack-React, Next.js, Vue, Node.js, Go, Kubernetes.",
    options: [
      { id: "continue", label: "Continue...", nextNode: "about-details-2" },
    ],
  },

  "about-details-2": {
    speaker: "daniele",
    text: "Currently exploring AI and making intelligent systems actually usable by humans.",
    options: [
      {
        id: "about-philosophy",
        label: "What's your development philosophy?",
        nextNode: "about-philosophy",
      },
      {
        id: "back",
        label: "Let's talk about something else",
        nextNode: "welcome",
      },
    ],
  },

  "about-philosophy": {
    speaker: "daniele",
    text: "Code should be clean, tested, and user-first. Tests aren't optional. And please don't use 'any' in TypeScript!",
    options: [
      {
        id: "back",
        label: "Wise words! Back to the main topics",
        nextNode: "welcome",
      },
    ],
  },

  "about-hobbies": {
    speaker: "daniele",
    text: "Beyond code: retro games (hence this portfolio!), hiking the Swiss Alps, and tinkering with AI tools.",
    options: [
      {
        id: "about-games",
        label: "What retro games?",
        nextNode: "about-games",
      },
      {
        id: "back",
        label: "Cool! Let's talk about something else",
        nextNode: "welcome",
      },
    ],
  },

  "about-games": {
    speaker: "daniele",
    text: "LucasArts adventures are my favorite-Monkey Island, Day of the Tentacle, Grim Fandango. This portfolio is a love letter to that era.",
    options: [
      {
        id: "back",
        label: "Classic! Back to the main topics",
        nextNode: "welcome",
      },
    ],
  },

  // Work branch
  "work-intro": {
    speaker: "daniele",
    text: "I'm a Senior Full Stack Engineer at Snyk, building billing, security, and scanner features. Busy place, good quests.",
    options: [
      { id: "continue", label: "Continue...", nextNode: "work-intro-2" },
    ],
  },

  "work-intro-2": {
    speaker: "daniele",
    text: "Previously Tech Lead at Frontiers and engineer at Meta. I build delightful experiences while keeping an eye on performance and scalability.",
    options: [
      {
        id: "work-stack",
        label: "What's your tech stack?",
        nextNode: "work-stack",
      },
      {
        id: "work-experience",
        label: "Tell me more about your experience",
        nextNode: "work-experience",
      },
      {
        id: "back",
        label: "Let's talk about something else",
        nextNode: "welcome",
      },
    ],
  },

  "work-stack": {
    speaker: "daniele",
    text: "Frontend: React, Next.js, Vue, TypeScript, TanStack. Backend: Node.js, Go, PostgreSQL. DevOps: Kubernetes, Docker, CI/CD pipelines.",
    options: [
      { id: "continue", label: "Continue...", nextNode: "work-stack-2" },
    ],
  },

  "work-stack-2": {
    speaker: "daniele",
    text: "I also wrote AI playbooks adopted by 100+ Snyk engineers and placed third company-wide for AI adoption.",
    options: [
      {
        id: "work-projects",
        label: "Any cool projects?",
        nextNode: "work-projects",
      },
      {
        id: "back",
        label: "Impressive! Back to the main topics",
        nextNode: "welcome",
      },
    ],
  },

  "work-projects": {
    speaker: "daniele",
    text: "At Snyk: a billing dashboard, custom security rules, and a scanner handling 500K+ scans a day. No idle animations there.",
    options: [
      { id: "continue", label: "Continue...", nextNode: "work-projects-2" },
    ],
  },

  "work-projects-2": {
    speaker: "daniele",
    text: "At Frontiers, Brink UI cut delivery time by 30%. At Meta, Mapillary's LCP fell by 60%. The Experience album has the details.",
    options: [
      {
        id: "side-projects",
        label: "Any side quests?",
        nextNode: "work-side-projects",
      },
      {
        id: "back",
        label: "I'll check it out! Back to the main topics",
        nextNode: "welcome",
      },
    ],
  },

  "work-side-projects": {
    speaker: "daniele",
    text: "I built this adventure and CalcolaFisco, an Italian tax calculator that reached 800 active users in its first week. Side quests count.",
    options: [
      {
        id: "back",
        label: "Back to the main topics",
        nextNode: "welcome",
      },
    ],
  },

  "work-experience": {
    speaker: "daniele",
    text: "Currently at Snyk doing full-stack security tools. Before: Tech Lead at Frontiers, Frontend at Meta (Mapillary integration).",
    options: [
      { id: "continue", label: "Continue...", nextNode: "work-experience-2" },
    ],
  },

  "work-experience-2": {
    speaker: "daniele",
    text: "Before that: Tundra, Tray.ai, OVO Energy, Noble, and Hackney Council. Ten years of shipping code, give or take a loading screen.",
    options: [
      {
        id: "back",
        label: "Nice track record! Back to the main topics",
        nextNode: "welcome",
      },
    ],
  },

  // Hire branch
  "hire-info": {
    speaker: "daniele",
    text: "Always curious about exciting opportunities—especially involving AI, developer tools, or making complex systems more human-friendly.",
    options: [
      {
        id: "hire-contact",
        label: "How can I reach you?",
        nextNode: "hire-contact",
      },
      {
        id: "hire-remote",
        label: "Do you work remotely?",
        nextNode: "hire-remote",
      },
      {
        id: "back",
        label: "Good to know! Back to the main topics",
        nextNode: "welcome",
      },
    ],
  },

  "hire-contact": {
    speaker: "daniele",
    text: "Email: danieletortora.contact@gmail.com. Also on LinkedIn and GitHub—links in the toolbar. Or press Contact in the toolbar!",
    options: [
      {
        id: "back",
        label: "Perfect! Back to the main topics",
        nextNode: "welcome",
      },
    ],
  },

  "hire-remote": {
    speaker: "daniele",
    text: `Based in ${PROFILE.location}, but experienced with remote/hybrid work. Async communication, video calls, good documentation—I know the drill.`,
    options: [
      {
        id: "back",
        label: "Remote work is great! Back to the main topics",
        nextNode: "welcome",
      },
    ],
  },

  // Goodbye
  bye: {
    speaker: "daniele",
    text: "No worries! Feel free to explore, fly to a gate or two, or look for Easter eggs. Come back anytime!",
    options: [{ id: "close", label: "[Close dialog]", nextNode: "__close__" }],
  },

  // Easter eggs
  "easter-egg-click": {
    speaker: "daniele",
    text: "Still clicking? You'd make a great QA engineer. Try looking at everything—there might be a few surprises...",
    options: [{ id: "back", label: "Good tip!", nextNode: "welcome" }],
  },
};
