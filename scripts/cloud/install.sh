#!/usr/bin/env bash
# Cloud Agent environment: repository bootstrap (install phase).
# Runs after the repo is checked out. Idempotent: safe to run repeatedly.
#
# Responsibilities (source-derived setup only; NO long-running processes here):
#   - Install Node dependencies from the lockfile.
#   - Generate .env.local for local development if it is not already present.
#     (.env.local is gitignored, so it never arrives via checkout.)
#
# Docker, the Supabase stack, and the dev server are runtime concerns handled by
# scripts/cloud/start.sh (start phase) and the dev terminal.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo "[install] Installing Node dependencies (npm ci)..."
npm ci

if [ ! -f .env.local ]; then
  echo "[install] Writing .env.local for local Supabase development..."
  cat > .env.local <<'ENV'
# Local development environment for sessions.guide.
# Points at the local Supabase stack started by scripts/cloud/start.sh.
# These are the well-known local Supabase demo keys (NOT production secrets).

NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Dev invite code for the /join and /verify-invite gate
INVITE_CODES=devinvite

# Seed guard confirmation for local dev seed scripts (non-production DB only)
ALLOW_SEED=1
ENV
else
  echo "[install] .env.local already present; leaving it untouched."
fi

echo "[install] Done."
