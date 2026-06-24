#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEFAULT_DB="/home/companion/.config/companion-nodejs/v4.3/db.sqlite"
DB_PATH="${1:-$DEFAULT_DB}"

if [ ! -f "$DB_PATH" ]; then
  printf 'Database not found:\n%s\n\nUsage:\n%s /path/to/db.sqlite\n' "$DB_PATH" "$0"
  exit 1
fi

NODE_BIN=""
if command -v node >/dev/null 2>&1; then
  NODE_BIN=$(command -v node)
elif [ -x "/opt/companion/node-runtimes/node22/bin/node" ]; then
  NODE_BIN="/opt/companion/node-runtimes/node22/bin/node"
elif [ -x "/opt/companion/node-runtimes/main/bin/node" ]; then
  NODE_BIN="/opt/companion/node-runtimes/main/bin/node"
fi

if [ -z "$NODE_BIN" ]; then
  printf 'Node.js was not found. Install Node.js or run this importer using Companion'\''s bundled Node runtime.\n'
  exit 1
fi

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files companion.service >/dev/null 2>&1; then
  printf 'Stopping Companion service...\n'
  sudo systemctl stop companion.service
  sudo "$NODE_BIN" "$SCRIPT_DIR/import-atem-ts3019-triggers.mjs" --db "$DB_PATH" --atem-label atem --ts3019-label TS3019
  printf 'Starting Companion service...\n'
  sudo systemctl start companion.service
else
  printf 'No companion.service found. Make sure Companion is stopped before continuing.\n'
  "$NODE_BIN" "$SCRIPT_DIR/import-atem-ts3019-triggers.mjs" --db "$DB_PATH" --atem-label atem --ts3019-label TS3019
fi

printf 'Done.\n'
