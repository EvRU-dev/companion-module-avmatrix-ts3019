# ATEM to AVMATRIX TS3019 Trigger Import

This example imports a complete Bitfocus Companion v4 trigger collection for controlling AVMATRIX TS3019 tally lamps from a Blackmagic ATEM connection.

It creates 48 triggers:

- ATEM input 1-12 Program tally on -> TS3019 lamp 1-12 Program
- ATEM input 1-12 Program tally off -> TS3019 lamp 1-12 Clear Program only
- ATEM input 1-12 Preview tally on -> TS3019 lamp 1-12 Preview
- ATEM input 1-12 Preview tally off -> TS3019 lamp 1-12 Clear Preview only

The TS3019 module should be version `0.1.0-beta.6` or newer, because the triggers use the `Clear Program only` and `Clear Preview only` action states.

## Requirements

- Bitfocus Companion v4
- A connection using the `bmd-atem` module
- A connection using the `avmatrix-ts3019` module
- Python 3 on the Companion machine

Stop Companion before editing the database.

## Raspberry Pi / CompanionPi

```sh
sudo systemctl stop companion.service
sudo python3 import-atem-ts3019-triggers.py \
  --db /home/companion/.config/companion-nodejs/v4.3/db.sqlite \
  --atem-label atem \
  --ts3019-label TS3019
sudo systemctl start companion.service
```

## macOS / Windows

Find the Companion v4 `db.sqlite` file, stop Companion, then run:

```sh
python3 import-atem-ts3019-triggers.py --db /path/to/db.sqlite --atem-label atem --ts3019-label TS3019
```

On Windows, use the real path to `db.sqlite`, for example:

```bat
py import-atem-ts3019-triggers.py --db "C:\Path\To\db.sqlite" --atem-label atem --ts3019-label TS3019
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
