const { contextBridge, ipcRenderer } = require('electron')

// Keep preload self-contained. Sandboxed Electron preload scripts cannot safely
// require project-local modules before the bridge is exposed.
const IPC = {
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  SERIAL_LIST: 'serial:list-ports',
  SERIAL_CONNECT: 'serial:connect',
  SERIAL_DISCONNECT: 'serial:disconnect',
  SERIAL_SEND: 'serial:send',
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

contextBridge.exposeInMainWorld('eonix', {
  window: {
    minimize: () => ipcRenderer.send(IPC.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.send(IPC.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.send(IPC.WINDOW_CLOSE),
  },

  serial: {
    listPorts: () => ipcRenderer.invoke(IPC.SERIAL_LIST),
    connect: (port) => ipcRenderer.invoke(IPC.SERIAL_CONNECT, port),
    disconnect: () => ipcRenderer.invoke(IPC.SERIAL_DISCONNECT),
    send: (command) => ipcRenderer.invoke(IPC.SERIAL_SEND, command),
    onDeviceConnected: (callback) => ipcRenderer.on(IPC.DEVICE_CONNECTED, (_, data) => callback(data)),
    onDeviceDisconnected: (callback) => ipcRenderer.on(IPC.DEVICE_DISCONNECTED, (_, data) => callback(data)),
    onModuleList: (callback) => ipcRenderer.on(IPC.MODULES_LIST, (_, data) => callback(data)),
    onTelemetry: (callback) => ipcRenderer.on(IPC.TELEMETRY_UPDATE, (_, data) => callback(data)),
    onLog: (callback) => ipcRenderer.on(IPC.DEVICE_LOG, (_, data) => callback(data)),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  },

  flash: {
    upload: (options) => ipcRenderer.invoke(IPC.FLASH_UPLOAD, options),
    onLog: (callback) => ipcRenderer.on(IPC.FLASH_LOG, (_, data) => callback(data)),
    removeLogListener: () => ipcRenderer.removeAllListeners(IPC.FLASH_LOG),
  },

  fs: {
    saveFile: (options) => ipcRenderer.invoke(IPC.FS_SAVE, options),
    readFile: (filePath) => ipcRenderer.invoke(IPC.FS_READ, filePath),
    showSaveDialog: (options) => ipcRenderer.invoke(IPC.FS_DIALOG_SAVE, options),
    showOpenDialog: (options) => ipcRenderer.invoke(IPC.FS_DIALOG_OPEN, options),
  },
})
