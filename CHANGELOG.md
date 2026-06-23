# Changelog

## 0.1.0-beta.5

- Add red-over-green priority for lamps that are both Program and Preview.
- Preserve logical Preview state when Program is active, so Preview can appear again after Program moves away.

## 0.1.0-beta.4

- Lazy-load `serialport` so Companion package checks can import the module entrypoint without requiring a native serialport binding at load time.

## 0.1.0-beta.3

- Prepare metadata for Bitfocus Developer Portal submission.
- Replace placeholder maintainer details with GitHub maintainer metadata.

## 0.1.0-beta.2

- Always publish values for all 12 lamp state variables.
- Fix blank values for lamps 9-12 when an existing Companion connection has `Number of lamps` set lower than 12.

## 0.1.0-beta.1

- Initial beta release.
- Add USB serial auto-detection for CH340, `ttyUSB`, `ttyACM`, macOS USB serial paths, and Windows COM ports.
- Add 12-lamp TS3019 control.
- Add Program, Preview, Both, and Off actions.
- Add Exclusive and Additive / transition tally modes.
- Add presets, feedbacks, variables, and Companion runtime permissions for `serialport`.
