#!/usr/bin/env bash
# One-click launcher for the Financial Intelligence Suite dev environment.
#
# - If a dev server is already responding in the 20000-20099 block, opens it.
# - Otherwise starts Vite on the first free port in that block, waits for it,
#   then opens the browser.
# - Logs to /tmp/fis-dev.log; status surfaced via notify-send when available.
#
# Designed to be invoked by ~/Bureau/Financial-Intelligence-Suite.desktop.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$(readlink -f "$0")")"/.. && pwd)"
PORT_START=20000
PORT_END=20099
LOG="/tmp/fis-dev.log"

notify() {
  if command -v notify-send >/dev/null 2>&1; then
    notify-send --app-name="Financial Intelligence Suite" "Financial Intelligence Suite" "$1" || true
  fi
}

load_node_env() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
    # Desktop launchers do not inherit the interactive shell PATH.
    # shellcheck source=/dev/null
    . "${NVM_DIR}/nvm.sh"
  fi
}

url_for_port() {
  printf "http://127.0.0.1:%s/" "$1"
}

is_up() {
  local url="$1"
  curl --silent --max-time 1 --output /dev/null --head "$url"
}

find_running_server() {
  local port url
  for port in $(seq "${PORT_START}" "${PORT_END}"); do
    url="$(url_for_port "$port")"
    if is_up "$url"; then
      printf "%s" "$port"
      return 0
    fi
  done
  return 1
}

find_free_port() {
  local port
  for port in $(seq "${PORT_START}" "${PORT_END}"); do
    if ! lsof -ti "tcp:${port}" >/dev/null 2>&1; then
      printf "%s" "$port"
      return 0
    fi
  done
  return 1
}

open_browser() {
  local url="$1"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 &
  elif command -v gio >/dev/null 2>&1; then
    gio open "$url" >/dev/null 2>&1 &
  fi
}

load_node_env

if ! command -v npm >/dev/null 2>&1; then
  notify "npm introuvable — vérifie Node/NVM"
  exit 1
fi

RUNNING_PORT="$(find_running_server || true)"
if [[ -n "${RUNNING_PORT}" ]]; then
  URL="$(url_for_port "${RUNNING_PORT}")"
  notify "Serveur déjà en ligne, ouverture du navigateur"
  open_browser "$URL"
  exit 0
fi

PORT="$(find_free_port || true)"
if [[ -z "${PORT}" ]]; then
  notify "Aucun port libre dans ${PORT_START}-${PORT_END}"
  exit 1
fi

cd "${PROJECT_DIR}"

if [[ ! -d node_modules ]]; then
  notify "Installation des dépendances npm…"
  : >"${LOG}"
  npm ci >>"${LOG}" 2>&1 || {
    notify "Échec npm ci — voir ${LOG}"
    exit 1
  }
fi

URL="$(url_for_port "${PORT}")"
notify "Démarrage du serveur Vite sur :${PORT}…"
: >"${LOG}"
if command -v setsid >/dev/null 2>&1; then
  setsid -f npm run dev -- --host 127.0.0.1 --port "${PORT}" >>"${LOG}" 2>&1 < /dev/null
else
  nohup npm run dev -- --host 127.0.0.1 --port "${PORT}" >>"${LOG}" 2>&1 < /dev/null &
fi

# Wait up to 30 seconds (60 × 0.5s) for the port to answer.
for _ in $(seq 1 60); do
  sleep 0.5
  if is_up "$URL"; then
    open_browser "$URL"
    notify "En ligne sur ${URL}"
    exit 0
  fi
done

notify "Échec démarrage — voir ${LOG}"
exit 1
