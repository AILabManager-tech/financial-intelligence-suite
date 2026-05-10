#!/usr/bin/env bash
# One-click launcher for the Financial Intelligence Suite dev environment.
#
# - If the dev server is already responding on :20000, just opens the browser.
# - Otherwise frees the port if a zombie process holds it, starts Vite,
#   waits for the port to answer, then opens the browser.
# - Logs to /tmp/fis-dev.log; status surfaced via notify-send when available.
#
# Designed to be invoked by ~/Bureau/Financial-Intelligence-Suite.desktop.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$(readlink -f "$0")")"/.. && pwd)"
PORT=20000
URL="http://127.0.0.1:${PORT}/"
LOG="/tmp/fis-dev.log"

notify() {
  if command -v notify-send >/dev/null 2>&1; then
    notify-send --app-name="Financial Intelligence Suite" "Financial Intelligence Suite" "$1" || true
  fi
}

is_up() {
  curl --silent --max-time 1 --output /dev/null --head "$URL"
}

open_browser() {
  xdg-open "$URL" >/dev/null 2>&1 &
}

if is_up; then
  notify "Serveur déjà en ligne, ouverture du navigateur"
  open_browser
  exit 0
fi

# Free the port if a stuck/zombie process is holding it.
PID="$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)"
if [[ -n "${PID}" ]]; then
  notify "Port ${PORT} occupé par PID ${PID}, libération"
  kill -TERM ${PID} 2>/dev/null || true
  sleep 1
  kill -KILL ${PID} 2>/dev/null || true
fi

cd "${PROJECT_DIR}"

notify "Démarrage du serveur Vite…"
: >"${LOG}"
nohup npm run dev -- --host 127.0.0.1 --port "${PORT}" >>"${LOG}" 2>&1 &

# Wait up to 30 seconds (60 × 0.5s) for the port to answer.
for _ in $(seq 1 60); do
  sleep 0.5
  if is_up; then
    open_browser
    notify "En ligne sur ${URL}"
    exit 0
  fi
done

notify "Échec démarrage — voir ${LOG}"
exit 1
