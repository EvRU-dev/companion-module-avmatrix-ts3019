# ATEM to AVMATRIX TS3019 Trigger Import

This example imports a complete Bitfocus Companion v4 trigger collection for controlling AVMATRIX TS3019 tally lamps from a Blackmagic ATEM connection.

It creates 72 triggers for the default 12-lamp setup:

- ATEM input 1-12 Program on -> TS3019 lamp 1-12 Program
- ATEM input 1-12 Program off -> TS3019 lamp 1-12 Clear Program only
- ATEM input 1-12 Preview on -> TS3019 lamp 1-12 Preview
- ATEM input 1-12 Preview off -> TS3019 lamp 1-12 Clear Preview only
- ATEM input 1-12 Preview on + Transition running -> TS3019 lamp 1-12 temporary Program
- ATEM input 1-12 Preview on + Transition not running -> TS3019 lamp 1-12 Clear Program only

The TS3019 module should be version `0.1.0-beta.8` or newer. Version `0.1.0-beta.8` packages the serial dependency needed for imported module packages on Windows, macOS, Linux, and Raspberry Pi.

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
