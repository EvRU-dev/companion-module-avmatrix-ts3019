#!/usr/bin/env bash
set -euo pipefail

PI_USER="${PI_USER:-ecreating}"
PI_HOST="${PI_HOST:-192.168.57.127}"
REMOTE_DIR="${REMOTE_DIR:-/home/${PI_USER}/companion-module-avmatrix-ts3019}"
COMPANION_DEV_DIR="${COMPANION_DEV_DIR:-/opt/companion-module-dev/companion-module-avmatrix-ts3019}"
COMPANION_NODE_BIN="${COMPANION_NODE_BIN:-/opt/companion/node-runtimes/node22/bin}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Installing AVMATRIX TS3019 Companion module to ${PI_USER}@${PI_HOST}:${REMOTE_DIR}"

ssh "${PI_USER}@${PI_HOST}" "mkdir -p '${REMOTE_DIR}'"

rsync -av --delete \
	--exclude node_modules \
	--exclude dist \
	--exclude .git \
	--exclude .codex-ssh \
	--exclude .yarn \
	"${ROOT_DIR}/" "${PI_USER}@${PI_HOST}:${REMOTE_DIR}/"

ssh "${PI_USER}@${PI_HOST}" "cd '${REMOTE_DIR}' && PATH='${COMPANION_NODE_BIN}':\$PATH corepack yarn install && PATH='${COMPANION_NODE_BIN}':\$PATH corepack yarn build"

ssh "${PI_USER}@${PI_HOST}" "sudo rm -rf '${COMPANION_DEV_DIR}' && sudo mkdir -p '${COMPANION_DEV_DIR}' && sudo rsync -a --delete '${REMOTE_DIR}/' '${COMPANION_DEV_DIR}/' && sudo chown -R companion:companion '${COMPANION_DEV_DIR}' && sudo systemctl restart companion.service"

echo
echo "Done."
echo "Use this path as the Companion development/custom module path:"
echo "${COMPANION_DEV_DIR}"
