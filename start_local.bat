@echo off
REM Double-click entry for launching the local AI resume generator on Windows.
set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start_local.ps1"
if errorlevel 1 (
  echo.
  echo [ResumeAI] Launch failed. Check the error output in this window.
  pause
)
