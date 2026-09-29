/**
 * Single source of truth for all personal/professional details
 * Update this file to change information across the entire portfolio
 */

export const PROFILE = {
  // Personal
  name: "Daniele Tortora",
  title: "Senior Software Engineer | Frontend & Full-Stack | AI Focused",
  location: "Switzerland",

  // Contact
  email: "danieletortora.contact@gmail.com",

  // Social links
  social: {
    github: "https://github.com/floroz",
    linkedin: "https://www.linkedin.com/in/danieletortora/",
  },

  // Bio/About summary
  bio: `As a software engineer with 10 years of experience, I've built my career on a core belief: that the most powerful systems are defined by their human experience.

This principle, shaped by my background in psychology, drives me to bridge the divide between complex software architecture and elegant, intuitive user interfaces.

I put this philosophy into practice across the full stack—delivering modern frontend applications, designing robust APIs, and building scalable distributed systems. I'm now keenly focused on applying this user-centric approach to AI, ensuring intelligent systems are not only powerful but also accessible and intuitive.

When I'm not coding, you can find me:
• Playing retro video games (hence this portfolio!)
• Exploring the Swiss Alps
• Learning about AI and emerging technologies`,

  // Skills categories (7 groups from resume)
  skills: {
    frontend: [
      "React",
      "TypeScript",
      "Vue.js",
      "Next.js",
      "Nuxt",
      "JavaScript",
      "Tailwind CSS",
      "Design Systems",
      "Component Libraries",
      "Accessibility (WCAG)",
      "Storybook",
    ],
    backend: [
      "Node.js",
      "Go",
      "Express.js",
      "GraphQL",
      "REST API",
      "gRPC",
      "Microservices",
      "Distributed Systems",
    ],
    ai: [
      "AI Integration",
      "Cursor",
      "Claude",
      "Gemini",
      "OpenAI APIs",
      "Prompt Engineering",
      "Context Management",
    ],
    cloud: [
      "AWS",
      "GCP",
      "Kubernetes",
      "Docker",
      "CI/CD",
      "GitHub Actions",
      "Datadog",
    ],
    data: ["PostgreSQL", "MongoDB", "Redis", "Kafka", "NATS", "Message Queues"],
    testing: [
      "Playwright",
      "Vitest",
      "Cypress",
      "Testing Library",
      "Jest",
      "Visual Regression Testing",
    ],
    leadership: [
      "Technical Leadership",
      "Team Management",
      "Agile",
      "Architecture Design",
      "Code Review",
      "Mentoring",
    ],
  },

  // Display names for the skill groups above (the London taps and chalkboard)
  skillGroupLabels: {
    frontend: "Frontend",
    backend: "Backend",
    ai: "AI & Tools",
    cloud: "Cloud & DevOps",
    data: "Data",
    testing: "Testing",
    leadership: "Leadership",
  },

  // Experience summary
  experienceSummary: `Senior Software Engineer with 10 years building production applications across the full stack.

Currently at Snyk:
• Building the Frontend Platform and AI-powered security features
• Providing technical leadership across teams and projects
• Won 3rd place company-wide for AI adoption initiatives

Previously:
• Frontend Tech Lead at Frontiers - Led team of 6 to build Vue 3 component library
• Frontend Engineer at Meta - Improved performance metrics by 20-60%
• Senior roles at Tundra, Tray.ai, OVO Energy

Core expertise: React, Vue, TypeScript, Node.js, Go, Kubernetes, AI integration`,

  // Featured projects
  projects: [
    {
      emoji: "🎮",
      name: "This Portfolio",
      description: "90s retro game inspired interactive portfolio",
      tech: "React, TypeScript, CSS pixel art",
    },
    {
      emoji: "🔒",
      name: "Snyk Code Rule Extensions",
      description: "AI-assisted security interface",
      tech: "Vue.js, TypeScript, custom SAST sanitizers",
    },
    {
      emoji: "🧩",
      name: "Brink UI",
      description: "Vue 3 Component Library",
      tech: "Led team of 6 to build design system from scratch",
    },
    {
      emoji: "🌍",
      name: "Mapillary Web Platform",
      description: "Meta Integration",
      tech: "Improved performance metrics by 20-60%",
    },
  ],

  // Contact section content
  contactInterests: [
    "Exciting opportunities in AI & and building platforms",
    "Full-stack and frontend challenges",
    "Tech conversations over coffee",
    "Open source collaboration",
  ],

  // Resume link
  resumeUrl:
    "https://danieletortora.netlify.app/pdf/Daniele_Tortora_Fullstack_Resume.pdf",

  // Work experience, newest first. `country` decides which scene shows the
  // job's memento: "london", "switzerland", or "italy" (see src/config/sections.ts).
  workExperience: [
    {
      company: "Snyk",
      role: "Full Stack Engineer",
      period: "May 2024 - Present",
      country: "switzerland",
    },
    {
      company: "Frontiers",
      role: "Frontend Tech Lead",
      period: "Feb 2023 - May 2024",
      country: "switzerland",
    },
    {
      company: "Meta (Facebook)",
      role: "Frontend Engineer",
      period: "Jun 2022 - Feb 2023",
      country: "switzerland",
    },
    {
      company: "Tundra",
      role: "Senior Frontend Engineer",
      period: "Nov 2021 - Jun 2022",
      country: "switzerland",
    },
    {
      company: "Tray.ai",
      role: "Senior Frontend Engineer",
      period: "Jan 2021 - Oct 2021",
      country: "london",
    },
    {
      company: "Past Frontend Roles",
      role: "Frontend Engineer / Software Engineer",
      period: "Sep 2016 - Dec 2020",
      country: "london",
    },
  ],

  // SEO metadata
  seo: {
    siteUrl: "https://www.danieletortora.com",
    siteName: "Daniele Tortora - Portfolio",
    shortDescription:
      "Senior Software Engineer with 10 years of experience building web applications in React, TypeScript, Golang, Next.js, Vue, Node.js. Currently focused on AI-powered solutions.",
    currentRole: "Senior Software Engineer",
    currentCompany: "Snyk",
    twitter: "@floroz87",
    themeColor: "#1a1a2e",
    ogImage: "og-image.png",
    keywords: [
      "Daniele Tortora",
      "floroz",
      "Senior Software Engineer",
      "Frontend Engineer",
      "Full Stack Developer",
      "React Developer",
      "TypeScript",
      "Vue.js",
      "Node.js",
      "AI Integration",
      "Design Systems",
      "Switzerland",
    ],
  },
} as const;
