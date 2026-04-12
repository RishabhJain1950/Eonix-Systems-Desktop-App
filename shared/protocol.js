/**
 * Shared IPC channel name constants.
 * Used by both electron/main.js (ipcMain) and electron/preload.js (ipcRenderer).
 */
module.exports = {
  // Window controls
  WINDOW_MINIMIZE:    'window:minimize',
  WINDOW_MAXIMIZE:    'window:maximize',
  WINDOW_CLOSE:       'window:close',

  // Serial / Device
  SERIAL_LIST:        'serial:list-ports',
  SERIAL_CONNECT:     'serial:connect',
  SERIAL_DISCONNECT:  'serial:disconnect',
  SERIAL_SEND:        'serial:send',

  // Device events (main → renderer)
  DEVICE_CONNECTED:   'device:connected',
  DEVICE_DISCONNECTED:'device:disconnected',
  DEVICE_LOG:         'device:log',
  MODULES_LIST:       'modules:list',
  TELEMETRY_UPDATE:   'telemetry:update',

  // Mock mode
  MOCK_ENABLE:        'mock:enable',
  MOCK_DISABLE:       'mock:disable',

  // Flash firmware
  FLASH_UPLOAD:       'flash:upload',
  FLASH_LOG:          'flash:log',

  // File system
  FS_SAVE:            'fs:save-file',
  FS_READ:            'fs:read-file',
  FS_DIALOG_SAVE:     'fs:show-save-dialog',
  FS_DIALOG_OPEN:     'fs:show-open-dialog',
}
