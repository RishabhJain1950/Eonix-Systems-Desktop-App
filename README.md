# Eonix Desktop App

Desktop configuration tool for **Eonix Systems** modules.

This is a **Vite + React** renderer with an **Electron** main process that talks to hardware over **USB-CDC / Serial** (STM32), requests the SAM module registry, assigns application roles, and generates user-MCU SPI API files.

## Project layout

- `app/`: renderer (React UI)
- `electron/`: Electron main + preload (IPC bridge exposed as `window.eonix`)
- `device/`: serial + device discovery/telemetry plumbing (`SerialHandler`)
- `codegen/`: role-based SPI API generation utilities
- `Images/`: source brand/logo images used to refresh runtime app assets
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
- App logo source: `Images/Logo Only White.png`.
- Runtime logo/icon outputs: `public/assets/eonix-app-logo.png`,
  `public/eonix-app-logo.png`, and `public/icon.ico`.
- The app never talks directly to modules. It talks to SAM, and SAM resolves
  UID/descriptor/runtime CAN IDs internally.
- Module cards show UID, descriptor/type, firmware version, hardware version,
  runtime CAN ID, role, and status.
- Code generation outputs `eonix_config.h`, `eonix_spi_api.h`, and
  `eonix_spi_api.c`. User code calls role functions such as
  `Eonix_Set_LEFT_MOTOR_Speed()` and must not depend on CAN IDs.
