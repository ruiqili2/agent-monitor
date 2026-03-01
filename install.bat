@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [install] Node.js is required but was not found in PATH.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [install] npm is required but was not found in PATH.
  exit /b 1
)

echo [install] Installing dependencies...
call npm install
if errorlevel 1 (
  echo [install] npm install failed.
  exit /b 1
)

echo [install] Building production bundle...
call npm run build
if errorlevel 1 (
  echo [install] npm run build failed.
  exit /b 1
)

echo [install] Completed successfully.
exit /b 0
