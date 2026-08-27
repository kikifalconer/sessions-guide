// Single source of truth for the brand mark. Never hand-type "guides’space"
// (or any variant) elsewhere — import from here instead.
//
// BRAND-13. Scope note: only files this task touches import from here today
// (src/app/page.tsx, src/components/site-header.tsx, src/components/site-footer.tsx,
// src/app/join-guidesspace/*). ~30 pre-existing files still hand-type the
// mark (src/app/layout.tsx, src/lib/metadata.ts, src/lib/seo/structuredData.tsx,
// and others) — that retrofit is deferred to a separate pass, not this one.
// See context files/decisions.md for the dated log entry.

export const BRAND_NAME = 'guides’space'
export const BRAND_NAME_HTML = 'guides&rsquo;space'
export const BRAND_DOMAIN = 'guidesspace.com'
export const BRAND_EMAIL_DOMAIN = 'guidesspace.com'
