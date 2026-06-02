#pragma once
/*
 * eonix_can_protocol.h  —  Eonix Shared CAN Protocol (Classic CAN, 500 kbps)
 *
 * Include in BOTH the module project and the motherboard project.
 *
 * ─── Bit timing ────────────────────────────────────────────────────────────
 * Target bitrate: 500 kbps
 *
 * STM32F103 Bluepill  (bxCAN, APB1 = 36 MHz):
 *   Prescaler = 4,  BS1 = 14,  BS2 = 3,  SJW = 1
 *   → 36 MHz / (4 × (1+14+3)) = 36 MHz / 72 = 500 kbps   SP = 83.3 %
 *
 * STM32G491RE Nucleo  (FDCAN, FDCAN clock = 170 MHz via PCLK1):
 *   NomPrescaler = 20,  NomTimeSeg1 = 14,  NomTimeSeg2 = 2,  NomSJW = 2
 *   → 170 MHz / (20 × (1+14+2)) = 170 MHz / 340 = 500 kbps  SP = 88.2 %
 *
 * ─── Message flow ──────────────────────────────────────────────────────────
 * Boot:
 *   Module → HELLO      (broadcast, repeats every ~1 s until ASSIGN_ID received)
 *   Module → DESCRIPTOR (broadcast, immediately after each HELLO)
 *   MB     → ASSIGN_ID  (broadcast with target uid32; once per new module)
 *
 * Runtime (request-response, motherboard drives timing):
 *   MB  → REQ_TELEMETRY   (uid32 in payload addresses target module)
 *   Mod → RESP_TELEMETRY  (uid32 in payload identifies source)
 *   MB  → CONFIG          (uid32 in payload addresses target module)
 *
 * ─── Raw gyro scale ────────────────────────────────────────────────────────
 *   MPU6050 default ±250 dps:  1 LSB = 1/131 dps
 *   Divide raw int16 by 131 to get degrees/second as float.
 */

#include <stdint.h>

/* ── 11-bit standard CAN IDs ─────────────────────────────────────────────── */
#define EONIX_CAN_ID_HELLO            0x100u   /* module  → bus (broadcast)  */
#define EONIX_CAN_ID_DESCRIPTOR       0x101u   /* module  → bus (broadcast)  */
#define EONIX_CAN_ID_ASSIGN_ID        0x102u   /* motherboard → bus          */
#define EONIX_CAN_ID_CONFIG           0x110u   /* motherboard → module       */
#define EONIX_CAN_ID_REQ_TELEMETRY    0x120u   /* motherboard → module       */
#define EONIX_CAN_ID_RESP_TELEMETRY   0x121u   /* module  → motherboard      */

/* ── Module types ────────────────────────────────────────────────────────── */
typedef enum {
    EONIX_MODULE_TYPE_VL53L0X = 1,
    EONIX_MODULE_TYPE_MPU6050 = 2,
    EONIX_MODULE_TYPE_LED     = 3,
} eonix_module_type_t;

/* ── CONFIG function IDs ─────────────────────────────────────────────────── */
typedef enum {
    EONIX_VL53L0X_CFG_SINGLE_SHOT  = 1,
    EONIX_MPU6050_CFG_CONTINUOUS    = 10,
    EONIX_LED_CFG_BLINK             = 20,
} eonix_function_id_t;

/* ── LED blink modes ─────────────────────────────────────────────────────── */
typedef enum {
    EONIX_LED_BLINK_OFF       = 0,
    EONIX_LED_BLINK_ON_APPLY  = 1,
} eonix_led_blink_mode_t;

/* ── Telemetry kinds ─────────────────────────────────────────────────────── */
typedef enum {
    EONIX_TELEMETRY_VL53_DISTANCE_MM  = 1,
    EONIX_TELEMETRY_IMU_GYRO_XY       = 2,  /* v0 = raw gx,  v1 = raw gy   */
    EONIX_TELEMETRY_LED_STATE         = 3,
    EONIX_TELEMETRY_IMU_GYRO_Z        = 4,  /* v0 = raw gz,  v1 = 0        */
} eonix_telemetry_kind_t;

/* Legacy alias — kept so old code that uses EONIX_TELEMETRY_IMU_GYRO still compiles */
#define EONIX_TELEMETRY_IMU_GYRO  EONIX_TELEMETRY_IMU_GYRO_XY

#define EONIX_MPU6050_GYRO_LSB_PER_DPS  131   /* ±250 dps full-scale */

/* ── Payload structs (packed, little-endian, 8 bytes each) ──────────────── */

typedef struct __attribute__((packed)) {
    uint32_t uid32;      /* lower 32 bits of STM32 UID (XOR-folded)    */
    uint8_t  type;       /* eonix_module_type_t                         */
    uint8_t  revision;   /* firmware revision                           */
    uint16_t reserved;
} eonix_hello_payload_t;

typedef struct __attribute__((packed)) {
    uint32_t uid32;
    uint16_t i2c_addr_a; /* primary I2C address (e.g. 0x68 for MPU6050) */
    uint16_t i2c_addr_b; /* secondary address, or 0                      */
} eonix_descriptor_payload_t;

typedef struct __attribute__((packed)) {
    uint32_t uid32;       /* target module UID                           */
    uint8_t  logical_id;  /* 1-based logical ID assigned by motherboard  */
    uint8_t  reserved[3];
} eonix_assign_id_payload_t;

typedef struct __attribute__((packed)) {
    uint32_t target_uid32;
    uint8_t  function;        /* eonix_function_id_t                     */
    uint8_t  led_blink_mode;  /* eonix_led_blink_mode_t                  */
    uint16_t params_u16;      /* packed params — MPU6050:
                                 bits[1:0] = fs_sel  (0=±250, 1=±500 dps)
                                 bits[3:2] = odr_sel
                                 bits[5:4] = out_sel                     */
} eonix_config_payload_t;

typedef struct __attribute__((packed)) {
    uint32_t target_uid32;
    uint8_t  telemetry_kind;  /* eonix_telemetry_kind_t                  */
    uint8_t  reserved;
    uint16_t tick;            /* correlation ID — echoed in response      */
} eonix_request_telemetry_payload_t;

typedef struct __attribute__((packed)) {
    uint32_t source_uid32;
    int16_t  v0;
    int16_t  v1;
} eonix_response_telemetry_payload_t;
