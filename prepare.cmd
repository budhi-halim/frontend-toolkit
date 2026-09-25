@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Reopen the terminal after installing Node.
  exit /b 1
)
node "%~dp0scripts\prepare.mjs" %*
exit /b %errorlevel%
