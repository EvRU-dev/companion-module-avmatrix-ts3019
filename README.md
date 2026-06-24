# companion-module-avmatrix-ts3019

Bitfocus Companion module for controlling AVMATRIX TS3019 tally lamps through the tally box USB-C serial port.

Current status: beta (`0.1.0-beta.6`).

The first implementation targets the TS3019 vMix-compatible USB mode, which appears to expose an Arduino/Firmata-style serial tally interface.

## Install as a custom/development module

Clone and build the module on the same machine that runs Companion:

```sh
git clone https://github.com/EvRU-dev/companion-module-avmatrix-ts3019.git
cd companion-module-avmatrix-ts3019
corepack yarn install
corepack yarn build
```

Then add the cloned folder as a Companion development/custom module path, or place it inside the Companion extra module directory.

## Official Companion listing

This repository is prepared for submission through the Bitfocus Developer Portal. The module is currently published as a GitHub prerelease while it is tested with real TS3019 hardware and ATEM/vMix trigger workflows.

## Development

Install dependencies:

```sh
yarn install
```

Build once:

```sh
yarn build
```

Watch during development:

```sh
yarn dev
```

## Raspberry Pi notes

Connect the TS3019 tally box by USB-C and look for the serial device:

```sh
ls -l /dev/ttyACM* /dev/ttyUSB*
```

If Companion cannot open the port, add the Companion user to the serial group and restart the service/session:

```sh
sudo usermod -aG dialout $USER
```

Typical settings:

- Serial device: `auto`, `/dev/ttyUSB0`, `/dev/ttyACM0`, or `/dev/serial/by-id/...`
- Baud rate: `57600`
- First preview pin: `2`
- Number of lamps: match the lamps paired with the tally box

On the TS3019 tally box, set USB-C as the input interface and set the USB-C interface to working mode.

## Companion trigger workflow

Create triggers from your switcher module, such as Blackmagic ATEM, and call this module's `Set lamp state` action.

For simple one-at-a-time tally updates, use `Exclusive` mode:

- Program input 1 -> Lamp 1 Program, Exclusive
- Preview input 2 -> Lamp 2 Preview, Exclusive

For ATEM tally, use the ATEM `Tally: Program` and `Tally: Preview` feedbacks as trigger conditions for each input/lamp pair:

- Program tally becomes true -> Lamp N Program, Additive / transition
- Program tally becomes false -> Lamp N Clear Program only, Additive / transition
- Preview tally becomes true -> Lamp N Preview, Additive / transition
- Preview tally becomes false -> Lamp N Clear Preview only, Additive / transition

This allows two red program lamps during fades or mix transitions while clearing the old Program lamp when ATEM reports that it is no longer on air. If a lamp is both Program and Preview, the red output has priority over green on the physical TS3019 output.

### Importable ATEM trigger example

The repository includes a portable Companion v4 trigger importer in `examples/atem-ts3019-triggers`.

It can create the full ATEM input 1-12 to TS3019 lamp 1-12 trigger collection on another Companion machine by reading that machine's `db.sqlite` and resolving the local ATEM/TS3019 connection IDs by label. The example includes Windows, macOS, and Linux/Raspberry launchers and does not require Python.
