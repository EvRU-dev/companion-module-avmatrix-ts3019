AVMATRIX TS3019 + ATEM trigger importer
========================================

This folder contains a helper that creates Companion triggers for this workflow:

ATEM input 1 -> TS3019 lamp 1
ATEM input 2 -> TS3019 lamp 2
...
ATEM input 12 -> TS3019 lamp 12

For every input/lamp pair it creates Program and Preview triggers, including
separate "clear red" and "clear green" triggers. This allows two red lights
during ATEM fade/mix transitions.


What to install first
---------------------

1. Install the AVMATRIX TS3019 module package in Companion:
   avmatrix-ts3019-0.1.0-beta.7.tgz

2. In Companion, create/configure these connections:
   - ATEM connection label: atem
   - TS3019 connection label: TS3019

3. Close/stop Companion before running this trigger importer.


Which file to run
-----------------

Windows:
  Run import-windows.bat

macOS:
  Run import-macos.command

Linux / Raspberry Pi / CompanionPi:
  Run import-linux-raspberry.sh


Do I need Python or Node.js?
----------------------------

No separate Python or Node.js install should be required.

The scripts try to use the Node runtime bundled with Companion. If the script
cannot find it automatically, it will ask you to paste the path to your
Companion install folder or directly to the bundled node/node.exe file.


Windows notes
-------------

If the script asks for a database path, use Companion's db.sqlite file.

Typical location:
  %APPDATA%\Bitfocus Companion\companion-nodejs\v4.3\db.sqlite

You can also drag db.sqlite onto import-windows.bat.

If the script cannot find Companion's bundled Node runtime, paste the path to
your Companion install folder, for example:
  C:\Program Files\Companion

or directly to node.exe, for example:
  C:\Program Files\Companion\node-runtimes\node22\bin\node.exe


macOS notes
-----------

If macOS blocks import-macos.command, open System Settings and allow it, or run:

  chmod +x import-macos.command
  ./import-macos.command

Typical database location:
  ~/Library/Application Support/Bitfocus Companion/companion-nodejs/v4.3/db.sqlite


Raspberry Pi / CompanionPi notes
--------------------------------

Run:

  chmod +x import-linux-raspberry.sh
  ./import-linux-raspberry.sh

The script will try to stop and start companion.service automatically.

Typical database location:
  /home/companion/.config/companion-nodejs/v4.3/db.sqlite


What changes will it make?
--------------------------

The importer creates or replaces one trigger collection:
  ATEM to TS3019

It makes a backup of db.sqlite before writing changes.

If a collection with the same name already exists, it replaces that collection
instead of creating duplicates.
