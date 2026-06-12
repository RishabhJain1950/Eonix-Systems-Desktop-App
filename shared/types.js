/**
 * @file shared/types.js
 * JSDoc type definitions shared across the Eonix Desktop App.
 * These are documentation-only; no runtime values are exported.
 */

/**
 * @typedef {'ACTIVE'|'NEW'|'MISSING'|'FAULT'|'REPLACED'|'UNCONFIGURED'} ModuleStatus
 */

/**
 * @typedef {Object} SamInfo
 * @property {string} device
 * @property {string} fw
 * @property {'usb_cdc'} transport
 * @property {string} port
 */

/**
 * @typedef {Object} EonixModule
 * @property {string|number} id
 * @property {string} uid                 - Permanent STM32 UID rendered as text
 * @property {string} descriptor          - Capability profile, for example MOTOR_DRIVER_1CH
 * @property {string} firmwareVersion
 * @property {string} hardwareVersion
 * @property {string|number} runtimeCanId - SAM-assigned runtime CAN ID
 * @property {string} canId               - Display form of runtimeCanId
 * @property {string} role                - User-facing application role
 * @property {ModuleStatus} status
 * @property {string[]} capabilities
 * @property {Object.<string, number|string|boolean>} config
 */

/**
 * @typedef {EonixModule & Object} TestLetterNumberModule
 * @property {'TEST_LETTER_NUMBER'} descriptor
 * @property {'TEST_LETTER_NUMBER'} type
 * @property {string} role
 * @property {number} nodeId
 * @property {number|string} runtime_cmd_id
 * @property {number|string} runtime_data_id
 * @property {boolean} online
 * @property {string} letter
 * @property {number} number
 * @property {boolean} led
 */

/**
 * @typedef {Object} TelemetryFrame
 * @property {string} role
 * @property {string} type
 * @property {string} letter
 * @property {number} number
 * @property {boolean} led
 * @property {boolean} online
 */

/**
 * @typedef {Object} ModuleRoleConfig
 * @property {string} role
 * @property {Object.<string, number|string|boolean>} config
 */

/**
 * @typedef {Object} DeviceInfo
 * @property {string} port
 * @property {string} [firmware]
 * @property {string} [transport]
 */

module.exports = {}
