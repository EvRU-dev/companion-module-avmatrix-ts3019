# AVMATRIX TS3019

This module controls AVMATRIX TS3019 tally lamps through the tally box USB-C serial connection.

## TS3019 setup

Set the tally box to USB-C input mode. In the TS3019 manual this is DIP SW1/SW2 = `1/0`.

Set the USB-C interface to working mode. In the TS3019 manual this is DIP SW6 = `1`.

Connect the tally box to the Companion machine by USB-C. On Raspberry Pi the device will usually appear as `/dev/ttyACM0` or `/dev/ttyUSB0`.

## Companion configuration

- Serial device: serial path for the TS3019 tally box. Use `auto` to detect the first likely USB serial adapter.
- Baud rate: defaults to `57600`.
- Number of lamps: how many lamps to initialize and clear.
- First preview pin: defaults to `2`, matching the vMix-style TS3019 mapping where lamp 1 uses preview pin 2 and program pin 3.
- Reconnect interval: delay before reopening the serial port after disconnect. Set to `0` to disable automatic reconnect.

## Actions

- Set lamp state: set a lamp to Off, Preview, Program, or Preview + Program.
  - Exclusive mode clears the same color from all other lamps before setting the selected lamp.
  - Additive / transition mode sets only the selected lamp and leaves other lamps unchanged.
- Clear all lamps: turn all configured lamps off.

## ATEM trigger example

Use Exclusive mode for simple one-at-a-time Program and Preview changes:

- ATEM Program input 1 -> Lamp 1 Program, Exclusive
- ATEM Preview input 2 -> Lamp 2 Preview, Exclusive

For ATEM tally, use the ATEM `Tally: Program` and `Tally: Preview` feedbacks as trigger conditions for each input/lamp pair:

- Program tally becomes true -> Lamp N Program, Additive / transition
- Program tally becomes false -> Lamp N Clear Program only, Additive / transition
- Preview tally becomes true -> Lamp N Preview, Additive / transition
- Preview tally becomes false -> Lamp N Clear Preview only, Additive / transition

The repository includes an importable Companion v4 example in `examples/atem-ts3019-triggers`.

## Variables

The module exposes `connected` and `lamp_N_state` variables for lamps 1 through 12.

## Notes

This implementation uses the TS3019's vMix-compatible USB behavior. If a specific unit does not respond, capture the USB serial traffic from vMix or the AVMATRIX configuration utility and the transport layer can be adjusted without changing the Companion actions.
