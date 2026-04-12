/**
 * @file shared/types.js
 * JSDoc type definitions shared across the Eonix Desktop App.
 * These are documentation-only — no runtime values are exported.
 */

/**
 * @typedef {Object} ModuleParameter
 * @property {string} name        - Parameter identifier (snake_case)
 * @property {'int'|'float'|'string'} type - Value type
 * @property {number|string} default - Default value
 */

/**
 * @typedef {Object} ModuleFunction
 * @property {string} name               - Function identifier (snake_case)
 * @property {ModuleParameter[]} parameters - Configurable parameters
 */

/**
 * @typedef {Object} EonixModule
 * @property {number} id           - Unique module ID on the CAN bus
 * @property {string} type         - Module category (e.g. 'lidar', 'imu', 'gpio')
 * @property {string} name         - Human-readable module name
 * @property {string} canId        - CAN bus address string (e.g. '0x01')
 * @property {ModuleFunction[]} functions - Available firmware functions
 */

/**
 * @typedef {Object} ModuleConfig
 * @property {string} function     - Selected function name
 * @property {Object.<string, number|string>} params - Parameter values keyed by param name
 */

/**
 * @typedef {Object} DeviceInfo
 * @property {string} port         - Serial port path (e.g. 'COM3') or 'MOCK'
 * @property {string} [firmware]   - Firmware version string
 * @property {boolean} [mock]      - True if running in mock/developer mode
 */

module.exports = {}
