# Eonix Desktop App

Desktop configuration tool for **Eonix Systems** modules.

This is a **Vite + React** renderer with an **Electron** main process that talks to hardware over **USB-CDC / Serial** (STM32), discovers modules on the CAN rails, configures them, and can generate STM32 C scaffolding.

## Project layout

- `app/`: renderer (React UI)
- `electron/`: Electron main + preload (IPC bridge exposed as `window.eonix`)
- `device/`: serial + device discovery/telemetry plumbing (`SerialHandler`)
- `codegen/`: STM32 code generation utilities + templates
- `shared/`: shared utilities/types (as the project grows)

Build outputs:

- `dist/`: Vite renderer build output
- `dist-electron/`: Electron main/preload build output
- `release/`: packaged installers/bundles from `electron-builder`

## Development

### Start (recommended on Windows)

Use the launcher which ensures Electron runs in GUI mode:

```bat
start-dev.bat
```

### Start (via npm)

```bash
npm run electron:dev
```

## Build installer

```bash
npm run electron:build
```

## Lint

```bash
npm run lint
```

## Notes

- Hardware auto-discovery targets STM32 native CDC and common ST-LINK VCP
  ports under VID `0483` (see `device/serial-handler.js`).
- Flashing expects `STM32_Programmer_CLI` available on PATH (from STM32CubeProgrammer).
