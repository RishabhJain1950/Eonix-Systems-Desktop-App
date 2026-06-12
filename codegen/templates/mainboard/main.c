/**
 * EONIX MAINBOARD FIRMWARE
 * 
 * Target: STM32F4xx / STM32F1xx (Ensure HAL library is included for your specific chip)
 * 
 * Usage:
 * 1. Initialize USB CDC (VCP) and I2C1 in Master Mode.
 * 2. Transmits the `module_list` JSON array over USB continuously/when requested so the desktop app finds real modules.
 * 3. Parses incoming JSON commands from the Desktop App and forwards them as I2C writes to the modules.
 */

 #include "main.h"
 #include "usbd_cdc_if.h" // For USB CDC communication
 #include "string.h"
 #include "stdio.h"
 
 I2C_HandleTypeDef hi2c1;
 
 // The 3 modules connected via I2C for this test
 #define MODULE_1_ADDR 0x10 << 1
 #define MODULE_2_ADDR 0x11 << 1
 #define MODULE_3_ADDR 0x12 << 1
 
 // Pre-structured JSON describing the 3 LED blinking modules
 const char* module_list_json = 
 "{\"cmd\":\"module_list\",\"modules\":["
 "{\"id\":1,\"type\":\"gpio\",\"name\":\"LED Module 1 (I2C: 0x10)\",\"functions\":[{\"name\":\"blink_led\",\"parameters\":[{\"name\":\"rate_ms\",\"type\":\"int\",\"default\":500}]}]},"
 "{\"id\":2,\"type\":\"gpio\",\"name\":\"LED Module 2 (I2C: 0x11)\",\"functions\":[{\"name\":\"blink_led\",\"parameters\":[{\"name\":\"rate_ms\",\"type\":\"int\",\"default\":500}]}]},"
 "{\"id\":3,\"type\":\"gpio\",\"name\":\"LED Module 3 (I2C: 0x12)\",\"functions\":[{\"name\":\"blink_led\",\"parameters\":[{\"name\":\"rate_ms\",\"type\":\"int\",\"default\":500}]}]}"
 "]}";
 
 // Buffer for parsing incoming USB data
 uint8_t usb_rx_buffer[256];
 volatile uint16_t usb_rx_length = 0;
 
 // Helper to send the 4-byte prefixed message over USB
 void SendFramedJSON(const char* json_str) {
     uint32_t len = strlen(json_str);
     
     // 1. Send 4-byte length header (little-endian)
     CDC_Transmit_FS((uint8_t*)&len, 4);
     HAL_Delay(5); // Slight delay to let USB host process the frame header
     
     // 2. Send JSON payload
     CDC_Transmit_FS((uint8_t*)json_str, len);
 }
 
 // Called from USB CDC Receive callback (`CDC_Receive_FS` in `usbd_cdc_if.c`)
 // You'll need to modify the auto-generated `CDC_Receive_FS` to pass data here.
 void Eonix_Process_USB_Data(uint8_t* Buf, uint32_t *Len) {
     if (*Len > 4) {
         // Naive packet deserialization: skip the 4 byte length header to read JSON
         char* json = (char*)(Buf + 4);
         
         // 1. Did the app ask for modules?
         if (strstr(json, "\"get_modules\"")) {
             SendFramedJSON(module_list_json);
         }
         
         // 2. Did the app send a configuration command for blink_led?
         // In production use a real JSON parser like cJSON. Here we use basic string matching for the test.
         // Example struct from app: {"cmd":"config", "moduleId":1, "params":{"rate_ms":150}}
         int module_id, rate_ms;
         if (sscanf(json, "{\"cmd\":\"config\",\"moduleId\":%d,\"params\":{\"rate_ms\":%d}}", &module_id, &rate_ms) == 2) {
             
             // Prepare the I2C payload (Register 0x01 = Blink rate, MSB, LSB)
             uint8_t i2c_data[3];
             i2c_data[0] = 0x01; // Register for blink rate
             i2c_data[1] = (rate_ms >> 8) & 0xFF; // High byte
             i2c_data[2] = rate_ms & 0xFF;        // Low byte
             
             uint16_t target_i2c_addr = 0;
             if (module_id == 1) target_i2c_addr = MODULE_1_ADDR;
             if (module_id == 2) target_i2c_addr = MODULE_2_ADDR;
             if (module_id == 3) target_i2c_addr = MODULE_3_ADDR;
             
             if (target_i2c_addr != 0) {
                 // Forward the blink rate config to the target module via I2C
                 HAL_I2C_Master_Transmit(&hi2c1, target_i2c_addr, i2c_data, 3, HAL_MAX_DELAY);
                 
                 // Send ACK back to PC App
                 SendFramedJSON("{\"cmd\":\"ack\"}");
             }
         }
     }
 }
 
 int main(void) {
     HAL_Init();
     // SystemClock_Config();
     // MX_GPIO_Init();
     // MX_I2C1_Init();
     // MX_USB_DEVICE_Init();
     
     uint32_t last_heartbeat = HAL_GetTick();
 
     while (1) {
         // Send module list every 5 seconds so the app auto-detects dynamically
         if (HAL_GetTick() - last_heartbeat > 5000) {
             SendFramedJSON(module_list_json);
             last_heartbeat = HAL_GetTick();
         }
         
         HAL_Delay(10);
     }
 }
