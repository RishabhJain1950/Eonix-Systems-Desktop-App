@echo off
:: Eonix Desktop App Launcher
:: Clears ELECTRON_RUN_AS_NODE so Electron boots in GUI mode (not headless Node)
SET ELECTRON_RUN_AS_NODE=
SET PATH=C:\Program Files\nodejs;%PATH%

cd /d "%~dp0"
"C:\Program Files\nodejs\npm.cmd" run electron:dev
