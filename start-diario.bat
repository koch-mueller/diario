@echo off
cd /d "%~dp0"
node start-diario.mjs
if errorlevel 1 (
  echo.
  pause
)
