@echo off
setlocal

cd /d "%~dp0"

set "DEFAULT_DB=%APPDATA%\Bitfocus Companion\companion-nodejs\v4.3\db.sqlite"
set "DB_PATH=%~1"
set "NODE="

if "%DB_PATH%"=="" (
  echo Companion database path.
  echo Press Enter to use:
  echo %DEFAULT_DB%
  set /p "DB_PATH=> "
)

if "%DB_PATH%"=="" set "DB_PATH=%DEFAULT_DB%"

if not exist "%DB_PATH%" (
  echo.
  echo Database not found:
  echo %DB_PATH%
  echo.
  echo Stop Companion and drag db.sqlite onto this .bat file, or run:
  echo import-windows.bat "C:\Path\To\db.sqlite"
  pause
  exit /b 1
)

where node >nul 2>nul
if %errorlevel%==0 set "NODE=node"

if "%NODE%"=="" if exist "%ProgramFiles%\Bitfocus Companion\node-runtimes\node22\bin\node.exe" set "NODE=%ProgramFiles%\Bitfocus Companion\node-runtimes\node22\bin\node.exe"
if "%NODE%"=="" if exist "%ProgramFiles%\Companion\node-runtimes\node22\bin\node.exe" set "NODE=%ProgramFiles%\Companion\node-runtimes\node22\bin\node.exe"
if "%NODE%"=="" if exist "%LOCALAPPDATA%\Programs\Companion\node-runtimes\node22\bin\node.exe" set "NODE=%LOCALAPPDATA%\Programs\Companion\node-runtimes\node22\bin\node.exe"
if "%NODE%"=="" if exist "%LOCALAPPDATA%\Programs\Bitfocus Companion\node-runtimes\node22\bin\node.exe" set "NODE=%LOCALAPPDATA%\Programs\Bitfocus Companion\node-runtimes\node22\bin\node.exe"

if "%NODE%"=="" (
  echo.
  echo Node.js was not found. Install Node.js or run this importer on the Companion machine using Companion's bundled Node runtime.
  pause
  exit /b 1
)

echo.
echo Make sure Companion is stopped before continuing.
pause

"%NODE%" "%~dp0import-atem-ts3019-triggers.mjs" --db "%DB_PATH%" --atem-label atem --ts3019-label TS3019

echo.
pause
