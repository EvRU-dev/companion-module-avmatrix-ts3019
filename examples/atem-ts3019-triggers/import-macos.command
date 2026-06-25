#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEFAULT_DB="$HOME/Library/Application Support/Bitfocus Companion/companion-nodejs/v4.3/db.sqlite"
DB_PATH="${1:-}"

if [ -z "$DB_PATH" ]; then
  printf 'Companion database path.\nPress Enter to use:\n%s\n> ' "$DEFAULT_DB"
  read DB_PATH
fi

if [ -z "$DB_PATH" ]; then
  DB_PATH="$DEFAULT_DB"
fi

if [ ! -f "$DB_PATH" ]; then
  printf '\nDatabase not found:\n%s\n\nStop Companion and run this file again with the path to db.sqlite.\n' "$DB_PATH"
  printf 'Example:\n%s "%s"\n' "$0" "$DEFAULT_DB"
  printf '\nPress Enter to exit.'
  read _
  exit 1
fi

NODE_BIN=""
if command -v node >/dev/null 2>&1; then
  NODE_BIN=$(command -v node)
elif [ -x "/Applications/Companion.app/Contents/Resources/node-runtimes/node22/bin/node" ]; then
  NODE_BIN="/Applications/Companion.app/Contents/Resources/node-runtimes/node22/bin/node"
elif [ -x "/Applications/Bitfocus Companion.app/Contents/Resources/node-runtimes/node22/bin/node" ]; then
  NODE_BIN="/Applications/Bitfocus Companion.app/Contents/Resources/node-runtimes/node22/bin/node"
else
  NODE_BIN=$(
    find /Applications "$HOME/Applications" -path '*Companion*.app*' -type f -name node 2>/dev/null | head -n 1 || true
  )
fi

if [ -z "$NODE_BIN" ]; then
  printf '\nCompanion bundled Node runtime was not found automatically.\n'
  printf 'You do not need to install Node.js.\n'
  printf 'Paste the path to Companion.app or directly to the bundled node file.\n> '
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
  printf '\nCould not find Companion bundled Node runtime. Nothing was changed.\n'
  printf 'See README.txt in this folder for what to check.\n'
  printf '\nPress Enter to exit.'
  read _
  exit 1
fi

printf '\nMake sure Companion is stopped before continuing.\nPress Enter to import triggers.'
read _

"$NODE_BIN" "$SCRIPT_DIR/import-atem-ts3019-triggers.mjs" --db "$DB_PATH" --atem-label atem --ts3019-label TS3019

printf '\nDone. Press Enter to exit.'
read _
