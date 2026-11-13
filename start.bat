@echo off
cd /d "%~dp0"
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo Node.js 20 or newer is required. Please install Node.js.
  pause
  exit /b 1
)
start "" "http://localhost:4173/#/home"
node server.js
pause
