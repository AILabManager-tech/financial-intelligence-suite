#!/usr/bin/env bash
#
# Post-deploy hook for the Financial Intelligence Suite on a Hostinger VPS.
#
# Trigger: invoked by Hostinger Git deployment (hpanel.hostinger.com →
# Hosting → Files → Git → "Run script after deploy") OR by hand after a
# manual `git pull`.
#
# Assumptions:
# - This script lives at $REPO_ROOT/hostinger/post-deploy.sh
# - Node 20+ is installed on the VPS (`node -v` must report >=20)
# - nginx is configured to serve $REPO_ROOT/dist
#
# Idempotent: safe to re-run after any push.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "[fis-deploy] $(date -Iseconds) — start (cwd=$REPO_ROOT, ref=$(git rev-parse --short HEAD))"

# 1. Install dependencies cleanly from the lockfile.
# NB: do NOT add --omit=optional — rollup needs @rollup/rollup-linux-x64-gnu
# (an optional native binding) to build the production bundle.
echo "[fis-deploy] installing dependencies"
npm ci

# 2. Build the production bundle into dist/.
echo "[fis-deploy] building dist/"
npm run build

# 3. Reload nginx so any header/cache changes apply (no-op if config unchanged).
if command -v systemctl >/dev/null 2>&1; then
  echo "[fis-deploy] reloading nginx"
  sudo systemctl reload nginx || echo "[fis-deploy] warning: nginx reload failed (insufficient sudo rights?)"
fi

echo "[fis-deploy] $(date -Iseconds) — done"
