# Firmware (STM32 test target)

This folder contains **minimal reference firmware** for quickly testing the Eonix Desktop App against a real board.

Target board for the first test:

- **Nucleo-F446RE**
- Onboard LED: **LD2 = PA5**
- USB connection: **ST-LINK USB** exposes a **Virtual COM Port (USB-CDC)**.

## Protocol used by the desktop app

The desktop app talks over Serial (USB CDC VCP) using a framed format:

- **4-byte little-endian length**
- followed by **UTF-8 JSON** of that length

Example payloads:

```json
{"cmd":"get_modules"}
```

```json
{"cmd":"set_module_config","moduleId":1,"function":"blink","params":{"rate_ms":250}}
```

## What the test firmware should do

- Respond to `get_modules` with a single module:
  - name: `Onboard LED (LD2)`
  - function: `blink`
  - parameter: `rate_ms` (int)
- Apply `rate_ms` updates **without reflashing** by updating an in-RAM variable.
- Blink LD2 at the configured period.

## How to use in STM32CubeIDE / CubeMX (high level)

1. Create a new CubeMX project for **NUCLEO-F446RE**.
2. Enable **USB_DEVICE → Communication Device Class (CDC)**.
3. Ensure **PA5** is configured as GPIO output (LD2).
4. Copy the reference files from `firmware/nucleo_f446re/` into your CubeIDE project:
   - `Core/Src/eonix_protocol.c`
   - `Core/Inc/eonix_protocol.h`
   - `Core/Src/jsmn.c`
   - `Core/Inc/jsmn.h`
5. In `usbd_cdc_if.c`, call `eonix_protocol_feed(rxBuf, rxLen)` from `CDC_Receive_FS`.
6. In your main loop, call `eonix_protocol_poll()` and blink using `eonix_get_blink_rate_ms()`.

Once flashed once, you can change the blink rate from the desktop app via **Modules → Apply to Hardware**.

