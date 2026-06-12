# Eonix Desktop App Context

This file is the current handoff source for the Eonix Configuration Tool.

## Architecture Lock

Eonix is a modular embedded ecosystem, not a single-sensor app.

System layers:

1. PC App
2. SAM
3. CAN Modules
4. User MCU

Data paths:

- PC App <-> USB CDC <-> SAM <-> CAN <-> Modules
- User MCU <-> SPI <-> SAM

The user-facing model is always roles, variables, and functions. Users should not need to understand CAN IDs, routing, or module internals.

## Current Desktop Scope

Implemented scope is intentionally limited to the current prototype:

- Real SAM detection over USB CDC.
- Real module discovery from SAM `module_list`.
- `TEST_LETTER_NUMBER` module UI.
- Pull telemetry by sending `get_telemetry` while the Telemetry tab is active.
- Arduino Uno and Arduino Mega SPI sketch generation.
- `USER CODE BEGIN` / `USER CODE END` preservation during regeneration.

Mock mode has been removed from the app. There is no fake SAM connection, no fake module list, and no mock UI button.

## USB CDC Protocol

Serial transport is newline-delimited JSON at `115200` baud.

SAM detection:

```json
{"cmd":"ping"}
```

Expected SAM response:

```json
{"cmd":"pong","device":"EONIX_SAM","fw":"0.1.0","transport":"usb_cdc"}
```

The desktop app only marks SAM as connected after the `EONIX_SAM` pong.

Module discovery request:

```json
{"cmd":"get_modules"}
```

Expected response:

```json
{
  "cmd": "module_list",
  "modules": [
    {
      "uid": "0x12345678",
      "type": "TEST_LETTER_NUMBER",
      "role": "test_module_1",
      "node_id": 1,
      "runtime_cmd_id": "0x201",
      "runtime_data_id": "0x202",
      "online": true,
      "letter": "A",
      "number": 123,
      "led": false
    }
  ]
}
```

Configuration command:

```json
{"cmd":"set_config","role":"test_module_1","letter":"A","number":123,"led":true}
```

Telemetry request:

```json
{"cmd":"get_telemetry"}
```

Expected telemetry response:

```json
{"cmd":"telemetry","role":"test_module_1","type":"TEST_LETTER_NUMBER","letter":"A","number":123,"led":true,"online":true}
```

The app also accepts telemetry arrays under `modules`.

## Important Files

- `device/serial-handler.js`: USB CDC port scanning, ping/pong SAM detection, module discovery, telemetry normalization.
- `electron/preload.js`: renderer bridge. Exposes serial, flash, filesystem, and window APIs.
- `app/context/EonixContext.jsx`: app state, module config commands, telemetry polling.
- `app/domain/moduleModel.js`: module normalization and display helpers.
- `app/domain/samCommands.js`: SAM command builders.
- `app/components/modules/ModuleCard.jsx`: module-specific UI. Current concrete implementation is `TEST_LETTER_NUMBER`.
- `app/pages/Telemetry.jsx`: live telemetry display. Polls only while the tab is active.
- `app/pages/CodeGen.jsx`: target selector, generated code preview, copy action.
- `codegen/generator.js`: Arduino Uno/Mega sketch generator with protected user sections.
- `tools/run-electron-smoke.js`: Electron app smoke test for bridge and disconnected states.

## Generated Arduino SPI Contract

Generated sketches include:

- `#include <SPI.h>`
- `EonixSAM eonix;`
- `eonix.begin();`
- `eonix.update();`
- `eonix.test_module_1.getLetter();`
- `eonix.test_module_1.getNumber();`
- `eonix.test_module_1.setLed(bool);`

SPI request packet:

- `[0] 0xE0`
- `[1] 0x01`
- `[2] LED command valid flag`
- `[3] LED state`
- `[4-7] 0`

SPI response packet:

- `[0] 'E'`
- `[1] 'X'`
- `[2] 1`
- `[3] letter`
- `[4] number low byte`
- `[5] number high byte`
- `[6] status / LED`
- `[7] XOR checksum over bytes 0-6`

Generated sketches preserve these protected sections:

- `USER CODE BEGIN Includes`
- `USER CODE BEGIN Globals`
- `USER CODE BEGIN Setup`
- `USER CODE BEGIN Loop`
- `USER CODE BEGIN Functions`

Regeneration may replace generated framework code, but must preserve user code inside those markers.

## Pending Firmware Requirements

Firmware must provide the exact USB CDC JSON commands above.

Firmware must also implement the SPI pull architecture where the user MCU calls `eonix.update()` and SAM returns cached module state. Modules should continuously update SAM over CAN; SAM should serve the latest cached values over SPI.

SAM must remain generic. Adding a new module should primarily require app UI and generated API updates, not SAM firmware rewrites.
