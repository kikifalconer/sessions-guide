#!/usr/bin/env bash
# Cloud Agent environment: per-boot runtime reconciliation (start phase).
# Brings up the Docker daemon and the local Supabase stack, then seeds demo
# data. Idempotent and restart-safe: it must tolerate an already-running daemon
# or stack, reach a clear ready state, and then return (no foreground servers).
#
# The Next.js dev server is intentionally NOT started here; it runs as a
# long-lived tmux terminal (see .cursor/environment.json `terminals`).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# --- 1. Docker daemon (nested-VM friendly) --------------------------------
# Ubuntu 24.04 defaults to the nftables firewall backend, which cannot program
# rules in this nested kernel and breaks container-to-container networking.
# Force the legacy iptables backend and the fuse-overlayfs storage driver
# (the VM root fs is overlayfs, so overlay2 is unavailable).
echo "[start] Configuring Docker for the nested VM..."
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy >/dev/null 2>&1 || true
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy >/dev/null 2>&1 || true
sudo mkdir -p /etc/docker
echo '{"storage-driver":"fuse-overlayfs","firewall-backend":"iptables"}' | sudo tee /etc/docker/daemon.json >/dev/null

if ! sudo docker info >/dev/null 2>&1; then
  echo "[start] Starting dockerd..."
  sudo rm -f /var/run/docker.pid >/dev/null 2>&1 || true
  sudo sh -c 'nohup dockerd >/tmp/dockerd.log 2>&1 &'
  for i in $(seq 1 60); do
    sudo docker info >/dev/null 2>&1 && break
    sleep 1
  done
fi
sudo docker info >/dev/null 2>&1 || { echo "[start] ERROR: dockerd did not become ready"; tail -20 /tmp/dockerd.log 2>/dev/null; exit 1; }
# Let the non-root user talk to Docker (and the Supabase CLI) without sudo.
sudo chmod 666 /var/run/docker.sock || true
echo "[start] Docker is ready."

# --- 2. Supabase local stack ----------------------------------------------
# `supabase start` is idempotent: it reuses existing volumes (so applied
# migrations and seeded rows persist) and simply (re)starts containers.
if supabase status >/dev/null 2>&1; then
  echo "[start] Supabase already running."
else
  echo "[start] Starting Supabase local stack..."
  supabase start
fi

# Wait for the REST gateway to answer before seeding.
echo "[start] Waiting for Supabase API..."
for i in $(seq 1 60); do
  curl -sf -o /dev/null "http://127.0.0.1:54321/rest/v1/" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
    && break
  sleep 1
done

# --- 3. Demo data (idempotent) --------------------------------------------
echo "[start] Seeding demo data..."
ALLOW_SEED=1 node scripts/seed-demo.mjs || echo "[start] WARN: demo seed reported an issue (continuing)."

echo "[start] Environment ready. Dev server runs in the 'dev' terminal (http://localhost:3000)."
