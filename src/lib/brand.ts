// Single source of truth for the brand mark. Never hand-type "guides'space"
// (or any variant) elsewhere — import from here instead.
//
// Straight apostrophe, not curly — per docs/brand.md, "The mark". The logo
// asset (/guidesspace-logo-cream.gif, /guidesspace-logo-sage.png) uses a
// graphic dash separator, not a typographic apostrophe glyph, so the
// straight-apostrophe rule doesn't apply to it — see brand.md's "Amendment
// 2026-08-27 — the logo asset" note.
//
// BRAND-13. Scope note: src/lib/metadata.ts and src/lib/seo/structuredData.tsx
// import from here. ~29 other pre-existing files still hand-type the mark —
// that retrofit is deferred to a separate pass, not this one. See
// docs/rebrand-migration.md and context files/decisions.md.

export const BRAND_NAME = "guides'space"
export const BRAND_NAME_HTML = 'guides&apos;space'
export const BRAND_DOMAIN = 'guidesspace.com'
export const BRAND_EMAIL_DOMAIN = 'guidesspace.com'
