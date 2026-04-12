#ifndef EONIX_PROTOCOL_H
#define EONIX_PROTOCOL_H

#include <stdint.h>
#include <stddef.h>

// Call from USB CDC RX callback (raw bytes)
void eonix_protocol_feed(const uint8_t *data, size_t len);

// Call frequently from main loop to process completed frames
void eonix_protocol_poll(void);

// Current configured blink rate (ms)
uint32_t eonix_get_blink_rate_ms(void);

// Platform hook: send bytes back over CDC
// Implement this in your project (wrap CDC_Transmit_FS with retry).
int eonix_cdc_write(const uint8_t *buf, uint16_t len);

// Platform hook: millisecond tick
uint32_t eonix_millis(void);

#endif /* EONIX_PROTOCOL_H */
