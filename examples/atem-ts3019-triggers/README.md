# ATEM to AVMATRIX TS3019 Trigger Import

This example imports a complete Bitfocus Companion v4 trigger collection for syncing AVMATRIX TS3019 tally lamps from Blackmagic ATEM Program/Preview variables.

It creates 50 triggers for the default 12-lamp setup:

- ATEM input 1-12 Program on/off -> TS3019 sync action
- ATEM input 1-12 Preview on/off -> TS3019 sync action
- ATEM transition running/stopped -> TS3019 sync action

Each trigger calls `Sync all lamps from Program/Preview variables` with `$(atem:pgm1_input_id)`, `$(atem:pvw1_input_id)`, and `$(atem:tbar_1) > 0`.

The TS3019 module should be version `0.1.0-beta.11` or newer.

## Requirements

- Bitfocus Companion v4
- A connection using the `bmd-atem` module
- A connection using the `avmatrix-ts3019` module
- No separate Python or Node.js install is required. The platform launchers try to find the Node runtime bundled with Companion.

Stop Companion before editing the database.

## Recommended launchers

Use the launcher for the Companion machine:

- Windows: `import-windows.bat`
- macOS: `import-macos.command`
- Linux / Raspberry Pi / CompanionPi: `import-linux-raspberry.sh`

The shared importer is `import-atem-ts3019-triggers.mjs`. It uses the vendored `sql.js` SQLite engine in `vendor/sql.js`, so Python is not required.

For a short user-facing checklist, see `README.txt` in this folder.

## Raspberry Pi / CompanionPi

```sh
chmod +x import-linux-raspberry.sh
./import-linux-raspberry.sh
```

The Linux/Raspberry launcher stops and starts `companion.service` automatically when that service exists.

## macOS

```sh
./import-macos.command
```

If macOS blocks the command file, allow it in System Settings or run:

```sh
chmod +x import-macos.command
./import-macos.command
```

## Windows

Stop Companion, then run:

```bat
import-windows.bat
```

You can also drag `db.sqlite` onto `import-windows.bat`, or pass the path explicitly:

```bat
import-windows.bat "C:\Path\To\db.sqlite"
```

## Manual Node command

```sh
node import-atem-ts3019-triggers.mjs --db /path/to/db.sqlite --atem-label atem --ts3019-label TS3019
```

## Options

- `--atem-label`: Companion label of the ATEM connection. Default: `atem`.
- `--ts3019-label`: Companion label of the TS3019 connection. Default: `TS3019`.
- `--lamp-count`: number of ATEM inputs / TS3019 lamps to map. Default: `12`.
- `--collection-label`: trigger collection name. Default: `ATEM to TS3019`.
- `--atem-model-id`: optional offline ATEM model ID to make inputs 1-12 valid before the ATEM connects. Default: `6` (`2 M/E Production 4K`).
- `--no-set-atem-model`: do not change the ATEM model setting.
- `--dry-run`: show what would be changed without writing to the database.

The importer makes a timestamped backup of the database before writing.
