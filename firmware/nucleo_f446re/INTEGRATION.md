## NUCLEO-F446RE integration (CubeMX / CubeIDE)

Goal: flash once, then change blink rate from the desktop app.

### 1) CubeMX settings

- **Board**: NUCLEO-F446RE
- **USB_DEVICE**: *Communication Device Class (Virtual Port Com)*
- **GPIO**: PA5 as *GPIO_Output* (LD2)

Generate code for STM32CubeIDE.

### 2) Copy in the protocol files

Copy these into your generated project:

- `firmware/nucleo_f446re/Core/Inc/eonix_protocol.h` → `Core/Inc/eonix_protocol.h`
- `firmware/nucleo_f446re/Core/Src/eonix_protocol.c` → `Core/Src/eonix_protocol.c`
- `firmware/nucleo_f446re/Core/Inc/jsmn.h` → `Core/Inc/jsmn.h`
- `firmware/nucleo_f446re/Core/Src/jsmn.c` → `Core/Src/jsmn.c`

### 3) Hook CDC receive → feed bytes

Edit `USB_DEVICE/App/usbd_cdc_if.c`.

In `CDC_Receive_FS(uint8_t* Buf, uint32_t *Len)` add:

```c
#include "eonix_protocol.h"
```

and before returning:

```c
eonix_protocol_feed(Buf, (size_t)*Len);
```

Keep the existing `USBD_CDC_SetRxBuffer` / `USBD_CDC_ReceivePacket` calls intact.

### 4) Implement the platform hooks

In any C file that can see CDC (commonly `usbd_cdc_if.c`), implement:

```c
#include "usbd_cdc_if.h"
#include "eonix_protocol.h"

int eonix_cdc_write(const uint8_t *buf, uint16_t len) {
  // CDC_Transmit_FS returns USBD_OK when the packet is accepted.
  // For a first test we keep it simple and don't retry/buffer.
  return (CDC_Transmit_FS((uint8_t*)buf, len) == USBD_OK) ? 1 : 0;
}

uint32_t eonix_millis(void) {
  return HAL_GetTick();
}
```

### 5) Blink loop uses configured rate

In `Core/Src/main.c`, after init, implement:

```c
#include "eonix_protocol.h"

static uint32_t last_toggle = 0;

while (1)
{
  eonix_protocol_poll();

  uint32_t now = HAL_GetTick();
  uint32_t period = eonix_get_blink_rate_ms();
  if ((now - last_toggle) >= period) {
    last_toggle = now;
    HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5); // LD2
  }
}
```

### 6) Desktop app behavior

- Plug in the Nucleo (ST-LINK USB).
- The app auto-detects **VID:PID 0483:5740** and will mark it as connected.
- The firmware responds to `get_modules` with one module: **Onboard LED (LD2)**.
- In **Modules**, pick function **blink**, set **rate_ms**, click **Apply to Hardware**.

