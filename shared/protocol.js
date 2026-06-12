/**
 * IPC channel names and SAM command names shared by Electron and device code.
 * Keep renderer-only domain helpers in app/domain; this file stays CommonJS so
 * Electron main, preload, and Node-side tooling can require it directly.
 */
module.exports = {
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',

  SERIAL_LIST: 'serial:list-ports',
  SERIAL_CONNECT: 'serial:connect',
  SERIAL_DISCONNECT: 'serial:disconnect',
  SERIAL_SEND: 'serial:send',

  CMD_PING: 'ping',
  CMD_GET_MODULES: 'get_modules',
  CMD_SET_CONFIG: 'set_config',
  CMD_SET_ROLE_CONFIG: 'set_role_config',
  CMD_IDENTIFY_MODULE: 'identify_module',
  CMD_REPLACE_MODULE: 'confirm_replacement',
  CMD_GET_TELEMETRY: 'get_telemetry',

  DEVICE_CONNECTED: 'device:connected',
  DEVICE_DISCONNECTED: 'device:disconnected',
  DEVICE_LOG: 'device:log',
  MODULES_LIST: 'modules:list',
  TELEMETRY_UPDATE: 'telemetry:update',

  FLASH_UPLOAD: 'flash:upload',
  FLASH_LOG: 'flash:log',

  FS_SAVE: 'fs:save-file',
  FS_READ: 'fs:read-file',
  FS_DIALOG_SAVE: 'fs:show-save-dialog',
  FS_DIALOG_OPEN: 'fs:show-open-dialog',
}
