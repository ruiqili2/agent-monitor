@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [startup] Node.js is required but was not found in PATH.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [startup] npm is required but was not found in PATH.
  exit /b 1
)

if not exist node_modules (
  echo [startup] node_modules not found. Running install first...
  call "%~dp0install.bat"
  if errorlevel 1 exit /b 1
)

if not exist .next\BUILD_ID (
  echo [startup] Production build not found. Building now...
  call npm run build
  if errorlevel 1 (
    echo [startup] npm run build failed.
    exit /b 1
  )
)

if "%PORT%"=="" set PORT=3000
if "%HOSTNAME%"=="" set HOSTNAME=0.0.0.0

echo [startup] Starting Agent Monitor on http://localhost:%PORT%
call npm start
exit /b %errorlevel%
