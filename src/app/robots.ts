// src/app/robots.ts
// Served at /robots.txt. Explicitly admits both search crawlers and the AI
// crawlers that feed assistant answers (Google AI Overviews uses the normal
// Google index via Googlebot; Google-Extended governs Gemini/AI training use;
// GPTBot/OAI-SearchBot feed ChatGPT; ClaudeBot feeds Claude; PerplexityBot
// feeds Perplexity). Being crawlable by these is a precondition for being
// cited when someone asks an AI "find me a reiki practitioner."

import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/siteUrl'

const DISALLOWED = [
  '/dashboard',
  '/api/',
  '/login',
  // Invite gate — no SEO value, keeps invite URLs out of indexes. Anchored with
  // `$` and paired with the trailing-slash form so this blocks /join and /join/*
  // WITHOUT also blocking /join-sessions, which is a public marketing page that
  // must stay crawlable. A bare `/join` prefix matches /join-sessions too.
  '/join$',
  '/join/',
  '/onboarding',
]

const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
]

export default function robots(): MetadataRoute.Robots {
  const SITE_URL = getSiteUrl()
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOWED },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: DISALLOWED,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
