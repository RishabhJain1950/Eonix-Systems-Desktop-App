const { contextBridge, ipcRenderer } = require('electron')

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('eonix', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  // Serial / Device
  serial: {
    listPorts: () => ipcRenderer.invoke('serial:list-ports'),
    connect: (port) => ipcRenderer.invoke('serial:connect', port),
    disconnect: () => ipcRenderer.invoke('serial:disconnect'),
    send: (cmd) => ipcRenderer.invoke('serial:send', cmd),
    onDeviceConnected: (cb) => ipcRenderer.on('device:connected', (_, data) => cb(data)),
    onDeviceDisconnected: (cb) => ipcRenderer.on('device:disconnected', (_, data) => cb(data)),
    onModuleList: (cb) => ipcRenderer.on('modules:list', (_, data) => cb(data)),
    onTelemetry: (cb) => ipcRenderer.on('telemetry:update', (_, data) => cb(data)),
    onLog: (cb) => ipcRenderer.on('device:log', (_, data) => cb(data)),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  },

  // Mock mode
  mock: {
    enable: () => ipcRenderer.invoke('mock:enable'),
    disable: () => ipcRenderer.invoke('mock:disable'),
  },

  // Flash
  flash: {
    upload: (opts) => ipcRenderer.invoke('flash:upload', opts),
    onLog: (cb) => ipcRenderer.on('flash:log', (_, data) => cb(data)),
    removeLogListener: () => ipcRenderer.removeAllListeners('flash:log'),
  },

  // Filesystem
  fs: {
    saveFile: (opts) => ipcRenderer.invoke('fs:save-file', opts),
    readFile: (path) => ipcRenderer.invoke('fs:read-file', path),
    showSaveDialog: (opts) => ipcRenderer.invoke('fs:show-save-dialog', opts),
    showOpenDialog: (opts) => ipcRenderer.invoke('fs:show-open-dialog', opts),
  },
})
