/**
 * Single source of truth for all personal/professional details
 * Update this file to change information across the entire portfolio
 */

export const PROFILE = {
  // Personal
  name: "Daniele Tortora",
  title: "Senior Full Stack Engineer",
  location: "Zürich, Switzerland",

  journey:
    "Sorrento is my hometown. From there I moved to London, then to Zürich, where I live now.",

  // Contact
  email: "danieletortora.contact@gmail.com",

  // Social links
  social: {
    github: "https://github.com/floroz",
    linkedin: "https://www.linkedin.com/in/danieletortora/",
  },

  // Bio/About summary
  bio: `Originally from Sorrento, I moved to London and then to Zürich, where I now live.

As a Senior Full Stack Engineer with 10 years of experience, I've built my career on a core belief: that the most powerful systems are defined by their human experience.

I earned a BSc in Psychology and an MSc in Clinical Psychology at Federico II in Naples, graduating 110/110 in each. That background drives me to bridge the divide between complex software architecture and elegant, intuitive user interfaces.

I put this philosophy into practice across the full stack—delivering modern frontend applications, designing robust APIs, and building scalable distributed systems. I'm now keenly focused on applying this user-centric approach to AI, ensuring intelligent systems are not only powerful but also accessible and intuitive.

When I'm not coding, you can find me:
• Playing retro video games (hence this portfolio!)
• Exploring the Swiss Alps
• Learning about AI and emerging technologies`,

  // Skills categories used by the London scene and reading pages
  skills: {
    frontend: [
      "React",
      "TypeScript",
      "Next.js",
      "Vue.js",
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
      "Python",
      "GraphQL",
      "REST API",
      "gRPC",
      "Microservices",
      "Distributed Systems",
    ],
    ai: [
      "Agentic Systems",
      "LangGraph & LangChain",
      "OpenAI",
      "Claude",
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
    data: ["PostgreSQL", "Redis", "Kafka", "NATS", "Message Queues"],
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
  experienceSummary: `Senior Full Stack Engineer with 10 years building data-intensive interfaces, scalable APIs, and distributed systems.

At Snyk, I helped launch the credit-based Billing & Usage Dashboard and built scanner features serving 500K+ daily scans. A worker-thread and caching redesign cut p95 latency by 65% and tripled throughput.

Before that, I led six engineers building Brink UI at Frontiers, where early adoption cut UI delivery time by 30%. At Meta, Mapillary's rebuild improved accessibility by 36% and reduced LCP by 60%.

I also wrote AI engineering playbooks adopted by 100+ Snyk engineers and placed third company-wide for driving AI adoption.`,

  // Personal projects shown in the Experience section
  projects: [
    {
      name: "This Portfolio",
      description:
        "A point-and-click portfolio with a Windows 98 desktop, a canvas scene engine, and a separate Pocket Adventure for phones.",
      tech: "React, TypeScript, SCSS, AI-augmented development",
      url: "https://github.com/floroz/retro-game-portfolio",
      linkLabel: "See source",
    },
    {
      name: "CalcolaFisco.com",
      description:
        "A multilingual Italian tax calculator for 2025/2026 that reached 800 active users in its first week through organic distribution.",
      tech: "React, TypeScript, Tailwind CSS, shadcn/ui",
      url: "https://www.calcolafisco.com/",
      linkLabel: "Visit project",
    },
  ],

  // Contact section content
  contactInterests: [
    "Exciting opportunities in AI and building platforms",
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
      role: "Senior Full Stack Engineer",
      period: "May 2024 - Present",
      country: "switzerland",
      highlights: [
        "Led delivery of the Billing & Usage Dashboard for Snyk EVO's credit-based launch to enterprise customers representing hundreds of millions in ARR.",
        "Built scanner features serving 500K+ daily scans; worker-thread caching cut p95 latency by 65% and tripled throughput.",
        "Migrated 300+ dashboard views to PostgreSQL across US, EU, and AU regions with zero downtime.",
        "AI engineering playbooks reached 100+ engineers; placed third company-wide for driving AI adoption.",
      ],
    },
    {
      company: "Frontiers",
      role: "Technical Lead",
      period: "Feb 2023 - May 2024",
      country: "switzerland",
      highlights: [
        "Led six engineers to launch Brink UI, a Vue 3 component library and design system.",
        "Delivered the alpha in five months; early adoption cut UI delivery time by 30%.",
      ],
    },
    {
      company: "Meta",
      role: "Frontend Engineer",
      period: "Jun 2022 - Feb 2023",
      country: "switzerland",
      highlights: [
        "Led Mapillary's web migration into Meta's infrastructure and shipped internationalization across 24 languages.",
        "The rebuild raised accessibility by 36%, performance by 17%, and SEO by 25%; LCP fell by 60%.",
      ],
    },
    {
      company: "Tundra",
      role: "Senior Frontend Engineer",
      period: "Nov 2021 - Jun 2022",
      country: "switzerland",
      highlights: [
        "Secured React and Chrome Extension sessions for more than 10K B2B users with OAuth 2.0 and JWT lifecycle management.",
        "A Next.js migration improved Core Web Vitals by 20-40% and contributed to a 15% rise in conversion.",
      ],
    },
    {
      company: "Tray.ai",
      role: "Senior Frontend Engineer",
      period: "Jan 2021 - Oct 2021",
      country: "london",
      highlights: [
        "Moved Tray Docs to Next.js with an interactive MDX compiler, cutting publishing time by 60% and lifting engagement by 45%.",
        "Algolia-powered search reduced support tickets by 30%.",
      ],
    },
    {
      company: "OVO Energy | Noble | Hackney Council",
      role: "Software Developer",
      period: "Sep 2016 - Jan 2021",
      country: "london",
      highlights: [
        "Built geospatial interfaces at OVO, a network threat dashboard at Noble, and citizen-facing services at Hackney Council.",
      ],
    },
  ],

  // SEO metadata
  seo: {
    siteUrl: "https://danieletortora.com/",
    siteName: "Daniele Tortora - Portfolio",
    shortDescription:
      "Senior Full Stack Engineer in Zürich with 10 years building data-intensive UIs, scalable APIs, and distributed systems. Explore my career in a 90s point-and-click adventure.",
    currentRole: "Senior Full Stack Engineer",
    currentCompany: "Snyk",
    twitter: "@floroz87",
    themeColor: "#1a1a2e",
    ogImage: "og-image.png",
    ogImageAlt:
      "Daniele faces the viewer in the airport hall among fellow travellers, with a departing airplane through the windows and the travel-trunk toolbar below.",
    keywords: [
      "Daniele Tortora",
      "floroz",
      "Senior Full Stack Engineer",
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
