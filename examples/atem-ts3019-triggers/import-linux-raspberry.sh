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
else
  NODE_BIN=$(
    find /opt /usr/local -path '*companion*' -type f -name node 2>/dev/null | head -n 1 || true
  )
fi

if [ -z "$NODE_BIN" ]; then
  printf 'Companion bundled Node runtime was not found automatically.\n'
  printf 'You do not need to install Node.js.\n'
  printf 'Paste the path to the Companion install folder, or directly to the bundled node file.\n> '
  read NODE_HINT
  if [ -n "$NODE_HINT" ]; then
    if [ -x "$NODE_HINT" ] && [ "$(basename "$NODE_HINT")" = "node" ]; then
      NODE_BIN="$NODE_HINT"
    elif [ -d "$NODE_HINT" ]; then
      NODE_BIN=$(find "$NODE_HINT" -type f -name node 2>/dev/null | head -n 1 || true)
    fi
  fi
fi

if [ -z "$NODE_BIN" ]; then
  printf 'Could not find Companion bundled Node runtime. Nothing was changed.\n'
  printf 'See README.txt in this folder for what to check.\n'
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
