<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Install with `npm ci`. The dev server is `npm run dev` on port 3000. There is no lint or test script. `npx tsc --noEmit` typechecks. `npm run build` runs `scripts/check-copy-placeholders.mjs` first.
- A production build fails when `NEXT_PUBLIC_SITE_URL` is missing or points at localhost. Development defaults that value to `http://localhost:3000`.
- Pages that render the site header construct a Supabase client immediately. Required variables, kept in gitignored `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Explore, profiles, and search use the service role key.
- Do not run `scripts/seed-*.mjs` or `scripts/teardown-verify-seed.mjs` unless the target is a disposable project. `scripts/seed-guard.mjs` refuses a host that matches `PROD_SUPABASE_URL`.
