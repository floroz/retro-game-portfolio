/**
 * Dialog tree content for the adventure game dialog system
 * Inspired by classic point-and-click adventures (Monkey Island, Day of the Tentacle)
 */

import type { DialogNode } from "../types/game";

export const DIALOG_TREE: Record<string, DialogNode> = {
  // Intro - shown first after welcome screen with typewriter effect
  intro: {
    speaker: "daniele",
    text: "Well, well, well... a visitor! You've stumbled upon my pixelated corner of the internet. I'm Daniele—software engineer by day, retro game enthusiast by... also day. Welcome to my interactive portfolio!",
    options: [
      { id: "continue", label: "Nice to meet you!", nextNode: "welcome" },
    ],
  },

  // Welcome / Main hub
  welcome: {
    speaker: "daniele",
    text: "So, brave adventurer, what quest brings you here today?",
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
    text: "Ah, you want my origin story? Plot twist: I started with a Master's in Psychology! Turns out, understanding how humans think is pretty useful when you're building software for them. 8+ years later, here I am in Zürich, Switzerland, bridging the gap between complex systems and intuitive experiences.",
    options: [
      {
        id: "about-more",
        label: "Psychology to coding? Tell me more!",
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
    text: "My psychology background taught me that the best systems are defined by their human experience. So I went full stack—React, Vue, Node.js, Go, Kubernetes... the whole buffet. Now I'm obsessed with AI and making intelligent systems that are actually usable by, you know, humans.",
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
    text: "Code should be clean, tested, and serve the user first. Tests aren't optional—they're how we sleep at night. And never, EVER use 'any' in TypeScript unless you have a really good reason and a written apology to your future self!",
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
    text: "When I'm not wrangling microservices, you'll find me playing retro video games—as this portfolio loudly proclaims! I also enjoy hiking the Swiss Alps, tinkering with AI tools, and occasionally convincing myself that 'just one more feature' won't take that long.",
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
    text: "LucasArts adventures are my jam—Monkey Island, Day of the Tentacle, Grim Fandango... This portfolio is basically my love letter to that golden era. I wanted to fight like a dairy farmer, but I settled for coding like one instead.",
    options: [
      {
        id: "back",
        label: "You fight like a cow! Back to the main topics",
        nextNode: "welcome",
      },
    ],
  },

  // Work branch
  "work-intro": {
    speaker: "daniele",
    text: "I'm a Full Stack Engineer at Snyk, building AI-powered security features that scan 500K+ projects daily. Before that, I was a Tech Lead at Frontiers and worked at Meta. Basically, I make things that help developers sleep better at night!",
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
    text: "React, Vue, and TypeScript on the frontend. Node.js and Go on the backend. Kubernetes, AWS, and GCP keeping it all running. I've also been diving deep into AI integration—won 3rd place company-wide at Snyk for AI adoption! Oh, and CSS is secretly one of my favorite things. Hence all the pixel art!",
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
    text: "At Snyk, I built an AI-assisted interface for custom security rules and designed a worker-thread architecture that cut latency by 65%. At Frontiers, I led a team building a Vue 3 component library from scratch. And at Meta, I improved web performance by up to 60%. Check out the Experience section for the full saga!",
    options: [
      {
        id: "back",
        label: "I'll check it out! Back to the main topics",
        nextNode: "welcome",
      },
    ],
  },

  "work-experience": {
    speaker: "daniele",
    text: "Currently at Snyk doing full-stack magic with security tools. Before that: Tech Lead at Frontiers (built a component library with a team of 6), Frontend Engineer at Meta (Mapillary integration), and senior roles at Tundra, Tray.ai, and OVO Energy. 8+ years of shipping code and only a few production incidents!",
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
    text: "Ah, a recruiter approaches! Or perhaps someone with an interesting project? Either way, I'm always curious about exciting opportunities—especially ones involving AI, developer tools, or anything that makes complex systems more human-friendly.",
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
    text: "Email me at danieletortora.contact@gmail.com, or find me on LinkedIn and GitHub—links are in the toolbar! Pro tip: you can also type 'contact' in the terminal for quick access. I promise I check my messages more often than I check my test coverage.",
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
    text: "I'm based in Zürich, Switzerland, but I've been doing remote and hybrid work for years. Async communication, video calls, Slack threads at 2 AM—I know the drill. Time zones are just numbers, and good documentation is my love language.",
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
    text: "No worries! Feel free to click around, open the terminal (try 'help'), or just admire the pixels. This portfolio doesn't have a three-headed monkey, but it does have some Easter eggs. Come back anytime!",
    options: [{ id: "close", label: "[Close dialog]", nextNode: "__close__" }],
  },

  // Easter eggs
  "easter-egg-click": {
    speaker: "daniele",
    text: "Still clicking? I admire your persistence! You'd make a great QA engineer. Did you know you can press T to open the terminal? There might be some hidden commands in there...",
    options: [{ id: "back", label: "Good tip!", nextNode: "welcome" }],
  },
};
