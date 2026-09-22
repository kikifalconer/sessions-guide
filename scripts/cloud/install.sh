#!/usr/bin/env bash
# Cloud Agent environment: repository + system bootstrap (install phase).
# Runs after the repo is checked out. Idempotent: safe to run repeatedly, and
# self-contained so it works from the default base image (it does not rely on a
# snapshot carrying system packages).
#
# Responsibilities (durable, source-derived setup only; NO long-running
# processes here — the Docker daemon and Supabase stack are started in
# scripts/cloud/start.sh):
#   - Install Docker + fuse-overlayfs so a local Supabase stack can run in the
#     nested Cloud Agent VM.
#   - Install a pinned Supabase CLI.
#   - Configure Docker networking/storage for the nested VM.
#   - Install Node dependencies from the lockfile.
#   - Generate .env.local for local development (gitignored, so never checked out).

set -euo pipefail

# Pinned Supabase CLI version (validated for this environment).
SUPABASE_CLI_VERSION="2.117.0"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# --- 1. Docker + fuse-overlayfs -------------------------------------------
if ! command -v dockerd >/dev/null 2>&1; then
  echo "[install] Installing Docker, iptables, and fuse-overlayfs..."
  sudo apt-get update -y || true
  # The fuse3/fuse-overlayfs post-install may fail to auto-start a service under
  # policy-rc.d; that is harmless (dockerd is started in start.sh), so tolerate
  # a non-zero apt exit and verify the binaries afterward.
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    docker.io fuse-overlayfs uidmap iptables || true
  command -v dockerd >/dev/null 2>&1 || { echo "[install] ERROR: dockerd not installed"; exit 1; }
  command -v fuse-overlayfs >/dev/null 2>&1 || { echo "[install] ERROR: fuse-overlayfs not installed"; exit 1; }
else
  echo "[install] Docker already installed."
fi

# --- 2. Supabase CLI (pinned) ---------------------------------------------
if ! command -v supabase >/dev/null 2>&1; then
  echo "[install] Installing Supabase CLI v${SUPABASE_CLI_VERSION}..."
  curl -fsSL \
    "https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_${SUPABASE_CLI_VERSION}_linux_amd64.deb" \
    -o /tmp/supabase.deb
  sudo dpkg -i /tmp/supabase.deb
  rm -f /tmp/supabase.deb
  command -v supabase >/dev/null 2>&1 || { echo "[install] ERROR: supabase CLI not installed"; exit 1; }
else
  echo "[install] Supabase CLI already installed ($(supabase --version 2>/dev/null | head -1))."
fi

# --- 3. Docker config for the nested VM -----------------------------------
# Ubuntu defaults to the nftables firewall backend, which cannot program rules
# in this nested kernel and breaks container-to-container networking. Force the
# legacy iptables backend and the fuse-overlayfs storage driver (the VM root fs
# is overlayfs, so overlay2 is unavailable).
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy >/dev/null 2>&1 || true
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy >/dev/null 2>&1 || true
sudo mkdir -p /etc/docker
echo '{"storage-driver":"fuse-overlayfs","firewall-backend":"iptables"}' | sudo tee /etc/docker/daemon.json >/dev/null

# --- 4. Node dependencies -------------------------------------------------
echo "[install] Installing Node dependencies (npm ci)..."
npm ci

# --- 5. Local dev environment file ----------------------------------------
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
