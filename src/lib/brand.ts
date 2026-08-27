// Single source of truth for the brand mark. Never hand-type "guides'space"
// (or any variant) elsewhere — import from here instead.
//
// Straight apostrophe, not curly — per Kiki, 2026-08-27 (docs/brand.md does
// not exist yet; this is authoritative until it lands and can be diffed
// against it). The logo asset (/guidesspace-logo-cream.gif,
// /guidesspace-logo-sage.png) uses a graphic dash separator, not a
// typographic apostrophe glyph, so this rule doesn't apply to it — see
// docs/rebrand-migration.md.
//
// BRAND-13. Scope note: src/lib/metadata.ts and src/lib/seo/structuredData.tsx
// now import from here (2026-08-27 retrofit). ~29 other pre-existing files
// still hand-type the mark — that retrofit is deferred to a separate pass,
// not this one. See context files/decisions.md for the dated log entry.

export const BRAND_NAME = "guides'space"
export const BRAND_NAME_HTML = 'guides&apos;space'
export const BRAND_DOMAIN = 'guidesspace.com'
export const BRAND_EMAIL_DOMAIN = 'guidesspace.com'
