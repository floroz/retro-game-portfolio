---
name: update-portfolio-content
description: Update portfolio personal information, resume data, and interactive dialogue content. Use when the user wants to update their resume, work experience, skills, bio, projects, or any personal information displayed on the portfolio website.
---

# Update Portfolio Content

This skill guides updating personal/professional content across the portfolio. All content lives in centralized config files—React components only read from these configs.

## Architecture Principle

**Components never hold personal information.** All content must be in config files:

- `src/config/profile.ts` - Single source of truth for all personal data
- `src/config/dialogTrees.ts` - Interactive chat dialogue content

## Update Workflow

### Step 1: Update Profile Config

Edit `src/config/profile.ts` with the new information. This file contains:

```typescript
PROFILE = {
  name, // Full name
  title, // Professional title
  location, // Current location
  email, // Contact email
  social, // { github, linkedin }
  bio, // About section text
  skills, // { frontend, backend, ai, cloud, data, testing, leadership }
  experienceSummary, // Work experience summary
  projects, // Array of { emoji, name, description, tech }
  contactInterests, // Array of discussion topics
  resumeUrl, // Path to resume PDF
  workExperience, // Work history for mobile and SEO
  seo, // Search and social metadata
};
```

### Step 2: Update Dialogue Trees

Edit `src/config/dialogTrees.ts` to reflect the updated information. Key nodes to update:

| Node               | Content to Update                               |
| ------------------ | ----------------------------------------------- |
| `intro`            | First impression, name, location                |
| `about-intro`      | Background story, years of experience, location |
| `about-details`    | Career journey, tech stack, current focus       |
| `about-philosophy` | Development philosophy                          |
| `work-intro`       | Current role, company, what you build           |
| `work-stack`       | Tech stack details, achievements                |
| `work-experience`  | Company history summary                         |
| `hire-contact`     | Email, contact methods                          |
| `hire-remote`      | Location, remote work preferences               |

### Step 3: Verify No Hardcoded Content

Check the actual consumers of each changed field, especially `src/components/mobile/RetroContent.tsx`, `src/config/inspections.ts`, `src/components/desktop/Windows98About.tsx`, and `scripts/generate-html.ts`. Keep personal details in `PROFILE` and dialogue in `DIALOG_TREE` rather than duplicating them in components.

### Step 4: Format and Lint

```bash
npm run format
npm run lint
```

## Dialogue Tone Guidelines

The portfolio has a retro game theme (Day of the Tentacle / Monkey Island inspired). Dialogue should be:

- **Playful and witty** - Include humor and game references
- **Accurate** - All facts must match the resume/profile data
- **Conversational** - Like talking to a friend, not reading a resume

### Example Dialogue Style

```typescript
// Good - playful with accurate info
"Plot twist: I started with a Master's in Psychology! 10 years later,
here I am in Zürich, building AI-powered security tools at Snyk."

// Bad - too formal
"I am a Senior Software Engineer with 10 years of experience
currently employed at Snyk in Zürich, Switzerland."
```

## Checklist

- [ ] Updated `src/config/profile.ts` with new information
- [ ] Updated relevant nodes in `src/config/dialogTrees.ts`
- [ ] Verified affected desktop, mobile, and SEO views
- [ ] Ran `npm run format`
- [ ] Tested the site with `npm run dev`
