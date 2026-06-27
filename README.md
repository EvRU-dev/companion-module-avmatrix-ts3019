# companion-module-avmatrix-ts3019

Bitfocus Companion module for controlling AVMATRIX TS3019 tally lamps through the tally box USB-C serial port.

Current status: beta (`0.1.0-beta.11`).

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

For Blackmagic ATEM, the recommended workflow is one Companion action driven by ATEM variables.

Use the `Sync all lamps from Program/Preview variables` action with expressions:

- Program input ID: `$(atem:pgm1_input_id)`
- Preview input ID: `$(atem:pvw1_input_id)`
- Transition active: `$(atem:tbar_1) > 0`

The action recalculates all TS3019 lamps as one complete state update:

- Program input N -> Lamp N red
- Preview input N -> Lamp N green
- During fade/mix transition, Preview input N also becomes red
- After CUT or transition completion, all lamps are normalized from current ATEM Program/Preview state

This avoids race conditions from multiple independent Companion triggers changing individual lamps.

Create triggers from your switcher module, such as Blackmagic ATEM, and call this module's sync action.

For simple one-at-a-time tally updates, use `Exclusive` mode:

- Program input 1 -> Lamp 1 Program, Exclusive
- Preview input 2 -> Lamp 2 Preview, Exclusive

For ATEM on ME1, use direct ATEM `Program`, `Preview`, and `Transition: Active/Running` feedbacks only as trigger conditions. Each trigger should call `Sync all lamps from Program/Preview variables`; it should not set one lamp directly.

- Program input N changes -> Sync all lamps
- Preview input N changes -> Sync all lamps
- Transition starts/stops -> Sync all lamps

This allows two red program lamps during fades or mix transitions. At the end of the transition, ATEM Program/Preview changes normalize the lamp states. If a lamp is both Program and Preview, the red output has priority over green on the physical TS3019 output.

### Importable ATEM trigger example

The repository includes a portable Companion v4 trigger importer in `examples/atem-ts3019-triggers`.

It can create the full ATEM input 1-12 to TS3019 lamp 1-12 trigger collection on another Companion machine by reading that machine's `db.sqlite` and resolving the local ATEM/TS3019 connection IDs by label. The example includes Windows, macOS, and Linux/Raspberry launchers and does not require Python.
