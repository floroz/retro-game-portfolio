/**
 * Single source of truth for all personal/professional details
 * Update this file to change information across the entire portfolio
 */

export const PROFILE = {
  // Personal
  name: "Daniele Tortora",
  title: "Senior Software Engineer | Full Stack & AI",
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

I'm a Senior Software Engineer with 10 years building full-stack applications, data-intensive interfaces, and distributed systems, including at Meta and Snyk. Today I build AI-powered workflows and use AI agents throughout my engineering work.

I earned a BSc in Psychology and an MSc in Clinical Psychology at Federico II in Naples, graduating 110/110 in each. That background shapes how I design interfaces and turn complex systems into intuitive experiences.

I define outcomes, write specifications, and coordinate parallel agents across software and artwork. Then I evaluate what we've built: how the system holds together, whether it works reliably, and how it feels to use. This adventure is one of those experiments.

I actively try new tools and approaches, share what works, and help other engineers explore what they can build with AI.

When I'm not coding, you can find me:
• Playing retro video games (hence this portfolio!)
• Exploring the Swiss Alps
• Learning about AI and emerging technologies`,

  // Skills categories used by the London scene and reading pages
  skills: {
    frontend: [
      "TypeScript",
      "React",
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
      "Python",
      "FastAPI",
      "LangChain",
      "LangGraph",
      "LangSmith",
      "LLM Integration",
      "Agentic Workflows",
      "MCP Integrations",
    ],
    delivery: [
      "Multi-Agent Orchestration",
      "Specification-Driven Development",
      "Agent Context Design",
      "Claude Code",
      "OpenAI Codex",
      "Cursor",
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
    data: [
      "PostgreSQL",
      "Redis",
      "Kafka",
      "NATS",
      "Snowflake",
      "Message Queues",
    ],
    testing: [
      "Playwright",
      "Vitest",
      "Cypress",
      "Testing Library",
      "Jest",
      "Visual Regression Testing",
    ],
  },

  // Display names for the skill groups above (the London taps and chalkboard)
  skillGroupLabels: {
    frontend: "Frontend",
    backend: "Backend",
    ai: "AI Product Engineering",
    delivery: "Agent-Assisted Delivery",
    cloud: "Cloud & DevOps",
    data: "Data",
    testing: "Testing",
  },

  // Experience summary
  experienceSummary: `Senior Software Engineer with 10 years building full-stack applications, data-intensive interfaces, and distributed systems.

At Snyk, I audited an internal production AI support-triage workflow and added attachment processing so investigations could use customer logs and screenshots. AI engineering playbooks I wrote reached 100+ engineers; I placed third in a company-wide AI adoption competition.

I also helped launch Snyk EVO's Billing & Usage Dashboard for enterprise customers representing hundreds of millions in ARR, with rich Vue 3 and Apache ECharts visualizations. Scanner features serve 500K+ daily scans; a worker-thread and caching redesign cut p95 latency by 65% and tripled throughput.

Before that, I led six engineers building Brink UI at Frontiers, where adoption cut UI delivery time by 30%. At Meta, Mapillary's rebuild improved accessibility by 36% and reduced LCP by 60%.`,

  // Personal projects shown in the Experience section
  projects: [
    {
      name: "This Portfolio",
      description:
        "A LucasArts-inspired adventure with a Windows 98 desktop and a mobile Pocket Adventure. I directed parallel software and artwork agents through shared specifications and task ownership, evaluated the running experience, and caught loading problems that led to image optimization from 19.3 MB to 2.6 MB with automated asset budgets.",
      tech: "TypeScript, React, Claude Code, OpenAI Codex, Multi-Agent Orchestration, Specification-Driven Development, Playwright",
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
    "Senior software engineering opportunities building AI-powered products",
    "Full-stack systems, interfaces, and delightful user experiences",
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
      role: "Senior Software Engineer",
      period: "May 2024 - Present",
      country: "switzerland",
      // Archived achievement (2026-10-11), retained for future reuse.
      // "Migrated 300+ dashboard views to PostgreSQL across US, EU, and AU regions with zero downtime."
      highlights: [
        "Contributed to an internal production AI support-triage workflow investigating Salesforce customer cases through Snowflake and Datadog MCP integrations. Audited the workflow and built an attachment-processing pipeline so investigations could incorporate customer-provided logs and screenshots, addressing a limitation identified by technical support engineers.",
        "Pioneered AI-augmented engineering practices across a 650-person engineering organization, winning 3rd place in a company-wide AI adoption competition. Authored playbooks adopted by 100+ engineers and used agentic workflows to compress multi-week refactoring projects into days.",
        "Drove frontend delivery for Snyk's credit-based consumption model rollout to enterprise customers representing hundreds of millions in ARR. Built the Billing & Usage Dashboard, a data-intensive analytics page with rich visualizations (Vue 3, Apache ECharts), supporting the General Availability launch of Snyk EVO. Shipped Snyk Code Rule Extensions, a custom SAST rules interface for enterprise security teams.",
        "Designed and shipped features for Snyk Open Source Java/Kotlin Scanner (500K+ daily scans), architecting microservices with REST/OpenAPI across multi-cloud Kubernetes clusters (AWS, GCP). Engineered a Node.js worker-thread architecture with multi-tier caching that cut p95 latency by 65% and delivered 3x throughput gains without event-loop blocking.",
      ],
    },
    {
      company: "Frontiers",
      role: "Senior Software Engineer (Frontend Lead)",
      period: "Feb 2023 - May 2024",
      country: "switzerland",
      highlights: [
        "Led 6 engineers to design and launch Brink UI, a component library and design system adopted across the organization. Defined component APIs and drove cross-functional adoption; delivered alpha in 5 months and reduced UI delivery time by 30%.",
        "Owned the monorepo’s CI/CD, testing, and release lifecycle. Built developer tooling and contributed upstream Vue ecosystem fixes to support adoption across product teams.",
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
        "Delivered secure authentication across a B2B web application and Chrome extension serving 10K+ users. Led the migration from a legacy SPA to Next.js, improving Core Web Vitals by 20–40% and contributing to a 15% increase in conversion.",
      ],
    },
    {
      company: "Tray.ai",
      role: "Senior Frontend Engineer",
      period: "Jan 2021 - Oct 2021",
      country: "london",
      highlights: [
        "Led the documentation platform migration to Next.js, combining interactive content tooling and Algolia search. Reduced publishing time by 60%, increased engagement by 45%, and reduced support tickets by 30%.",
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
      "Senior Software Engineer in Zürich building full-stack applications and AI-powered workflows. Explore 10 years of experience in a playable portfolio adventure.",
    currentRole: "Senior Software Engineer",
    currentCompany: "Snyk",
    twitter: "@floroz87",
    themeColor: "#1a1a2e",
    ogImage: "og-image.png",
    ogImageAlt:
      "Daniele faces the viewer in the airport hall among fellow travellers, with a departing airplane through the windows and the travel-trunk toolbar below.",
    keywords: [
      "Daniele Tortora",
      "floroz",
      "Senior Software Engineer",
      "Full Stack",
      "AI Engineering",
      "Agentic Workflows",
      "Specification-Driven Development",
      "React Developer",
      "TypeScript",
      "Vue.js",
      "Node.js",
      "Python",
      "FastAPI",
      "LangGraph",
      "Snowflake",
      "AI Integration",
      "Design Systems",
      "Switzerland",
    ],
  },
} as const;
