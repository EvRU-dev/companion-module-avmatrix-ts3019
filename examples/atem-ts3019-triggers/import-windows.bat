@echo off
setlocal EnableExtensions EnableDelayedExpansion

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

call :find_node "%ProgramFiles%\Bitfocus Companion"
call :find_node "%ProgramFiles%\Companion"
call :find_node "%ProgramFiles(x86)%\Bitfocus Companion"
call :find_node "%ProgramFiles(x86)%\Companion"
call :find_node "%LOCALAPPDATA%\Programs\Bitfocus Companion"
call :find_node "%LOCALAPPDATA%\Programs\Companion"
call :find_node "%LOCALAPPDATA%\Bitfocus Companion"
call :find_node "%LOCALAPPDATA%\Companion"
call :find_node "%APPDATA%\Bitfocus Companion"
call :find_node "%APPDATA%\Companion"

if "%NODE%"=="" (
  echo.
  echo Companion's bundled Node runtime was not found automatically.
  echo You do not need to install Node.js.
  echo.
  echo Paste the path to your Companion install folder, or directly to node.exe.
  echo Example folder: C:\Program Files\Companion
  echo Example node:   C:\Program Files\Companion\node-runtimes\node22\bin\node.exe
  set /p "NODE_HINT=> "
  call :resolve_node_hint "!NODE_HINT!"
)

if "%NODE%"=="" (
  echo.
  echo Could not find Companion's bundled Node runtime.
  echo Nothing was changed.
  echo.
  echo See README.txt in this folder for what to check.
  pause
  exit /b 1
)

echo.
echo Make sure Companion is stopped before continuing.
pause

"%NODE%" "%~dp0import-atem-ts3019-triggers.mjs" --db "%DB_PATH%" --atem-label atem --ts3019-label TS3019

echo.
pause
exit /b %errorlevel%

:find_node
if defined NODE exit /b 0
set "SEARCH_DIR=%~1"
if "%SEARCH_DIR%"=="" exit /b 0
if not exist "%SEARCH_DIR%" exit /b 0
for /f "delims=" %%F in ('where /r "%SEARCH_DIR%" node.exe 2^>nul') do (
  if not defined NODE set "NODE=%%F"
)
exit /b 0

:resolve_node_hint
if defined NODE exit /b 0
set "HINT=%~1"
if "%HINT%"=="" exit /b 0
if exist "%HINT%\node.exe" (
  set "NODE=%HINT%\node.exe"
  exit /b 0
)
if exist "%HINT%" (
  if /i "%~x1"==".exe" (
    set "NODE=%HINT%"
    exit /b 0
  )
  call :find_node "%HINT%"
)
exit /b 0
