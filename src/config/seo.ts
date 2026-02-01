/**
 * SEO Configuration for Portfolio
 * Re-exports SEO values from PROFILE for convenience in React components
 */

import { PROFILE } from "./profile";

export const SEO_CONFIG = {
  ...PROFILE.seo,
  author: {
    name: PROFILE.name,
    email: PROFILE.email,
  },
} as const;
