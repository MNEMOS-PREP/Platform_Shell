@echo off
setlocal
cd /d "%~dp0"

REM ============================================================
REM  The platform, in one command.
REM
REM  Starts every module repository checked out beside this one,
REM  then the shell on :5173 in this window. A module already
REM  listening on its port is left alone.
REM
REM    start.bat            modules, then the shell
REM    start.bat shell      the shell only, modules assumed up
REM    start.bat check      report what is on disk, launch nothing
REM
REM  What actually runs it: scripts\platform.ps1
REM  Ports:                 PORTS.txt (shell is 5173)
REM ============================================================

if /i "%~1"=="check" goto CHECK
if /i "%~1"=="shell" goto SHELL
if "%~1"==""         goto ALL
goto USAGE

:ALL
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\platform.ps1"
exit /b %errorlevel%

:SHELL
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\platform.ps1" -ShellOnly
exit /b %errorlevel%

:CHECK
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\platform.ps1" -Check
exit /b %errorlevel%

:USAGE
echo.
echo   Unknown option "%~1".
echo.
echo     start.bat            modules, then the shell
echo     start.bat shell      the shell only
echo     start.bat check      verify, launch nothing
echo.
exit /b 1
