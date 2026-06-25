# sessions.guide — Claude Code Context

## Project
Two-sided marketplace for transformational wellness practitioners and seekers.
Next.js App Router + TypeScript + Tailwind + Supabase + Stripe + Cloudinary.
Project directory: `~/Desktop/sessions-guide`

---

## Stack
- **Framework:** Next.js App Router (v16, Turbopack), TypeScript, Tailwind CSS
- **Database/Auth:** Supabase (PostgreSQL + RLS + Auth)
- **Media:** Cloudinary (all practitioner photos and video — NOT Supabase Storage)
- **Payments:** Stripe Billing (subscriptions) + Stripe Connect (session payments)
- **Email:** Resend
- **Maps/Places:** Google Places API (classic) — do NOT use Places API New
- **Calendar:** Google Calendar API (OAuth 2.0, two-way sync)
- **Geo queries:** PostGIS (already enabled)
- **Deployment:** Vercel

---

## Critical Schema Rules

### practitioners table
- Primary key is `id` — a FK to `auth.users.id`. NOT a separate `user_id` column.
- Always filter with `.eq('id', user.id)` — never `.eq('user_id', user.id)`
- Never use `randomUUID()` for practitioner ID — always use the auth user's ID
- Confirmed columns: `id`, `full_name`, `bio`, `slug`, `photo_url`, `video_url`, `modality_tags`, `tagline`, `website_url`, `instagram_url`, `youtube_url`, `subscription_tier`, `is_published`

### session_types table
- Uses `name` — NOT `title`
- Has `modality_id` FK to `modalities.id`
- Has `description`, `duration_minutes`, `price`, `pricing_model`, `format`

### availability_blocks table
- Location lives here — NEVER on the practitioners table
- `location_place_id` is a Google Places ID (never freeform text)
- `format` enum: `virtual` | `in_person` | `both`
- `location_place_id` required when format is `in_person` or `both`; null when `virtual` only
- See `availability-blocks.md` for full schema

### categories + modalities
- 12 fixed categories — never manually assigned; always inferred from modality
- `practitioner_modalities` join table; max 3 modalities per practitioner, exactly 1 primary
- See `categories-modalities.md` for full schema

---

## Supabase Client Pattern

**Server components / API routes (regular auth):**
```ts
import { createClient } from '@/lib/supabase/server'
```

**API routes needing RLS bypass (writes, admin operations):**
```ts
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```
Always use the regular server client solely to retrieve `user.id`, then pass that ID to service role operations.

---

## File Path Rules

Before writing any file, confirm the path exists:
```bash
find . -name "page.tsx" | grep -i [route]
```
All source files live under `src/` — not at root. Example: `src/app/dashboard/page.tsx`, NOT `app/dashboard/page.tsx`.

---

## Styling Rules

- Use global CSS variables and Tailwind utility classes — no inline styles except dynamic calculated values
- Never hardcode color hex values inline — always use CSS variables or Tailwind tokens
- CSS variables are defined in `src/app/globals.css`
- See `design-system.md` for all tokens, font usage, and component patterns

---

## Environment Variables (confirm names in .env.local before use)
```
NEXT_PUBLIC_SITE_URL        # REQUIRED at build/deploy time. Production builds (next build runs as
                            # PHASE_PRODUCTION_BUILD) hard-fail if missing or localhost — guarded by
                            # validateSiteUrl in next.config.ts, with a runtime backstop in src/lib/siteUrl.ts.
                            # Must be set as a Vercel project env var (absolute https origin, no trailing slash).
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
```

---

## Never Do These Things

- Never store location on the `practitioners` table — location lives on `availability_blocks`
- Never use `practitioners.user_id` — the column is `practitioners.id`
- Never use `session_types.title` — the column is `session_types.name`
- Never use Supabase Storage for media — use Cloudinary
- Never use Places API New — use Google Places API (classic)
- Never hardcode colors or fonts inline
- Never write to `app/` paths — always `src/app/`
- Never assume a column exists — check `schema.md` first
- Never generate code that bypasses RLS without explicitly using the service role client pattern above

---

## When Things Break

- Persistent ghost errors after code changes: delete `.next` folder, restart dev server
- Wrong file edited: run `find . -name "*.tsx" | grep -i [route]` to confirm path before editing
- Schema mismatch: check `schema.md` before writing any DB query
- Always diagnose before fixing — report the root cause before making changes

---

## Companion Files
- `schema.md` — complete database schema, all tables and columns
- `product-spec.md` — product decisions, business rules, terminology
- `design-system.md` — tokens, fonts, component patterns
- `brand-voice.md` — copy rules and tone
- `decisions.md` — architectural decision log
- `current-phase.md` — what is being built right now
- `availability-blocks.md` — availability block feature context
- `categories-modalities.md` — category and modality taxonomy context
