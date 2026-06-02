const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { SerialHandler } = require('../device/serial-handler')

let mainWindow = null
let serialHandler = null

app.setName('Eonix')
if (process.platform === 'win32') {
  app.setAppUserModelId('com.eonix.desktop')
}

function getIconPath() {
  if (process.env.VITE_DEV_SERVER_URL) {
    return path.join(__dirname, '../public/icon.ico')
  }
  return path.join(__dirname, '../dist/icon.ico')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    backgroundColor: '#0A0D14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: getIconPath(),
    show: false,
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Initialize serial handler
  serialHandler = new SerialHandler(mainWindow)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  if (serialHandler) await serialHandler.destroy()
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

// Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window:close', () => mainWindow?.close())

// Serial / Device
ipcMain.handle('serial:list-ports', async () => {
  return await serialHandler?.listPorts() ?? []
})

ipcMain.handle('serial:connect', async (_, portPath) => {
  return await serialHandler?.connect(portPath)
})

ipcMain.handle('serial:disconnect', async () => {
  return await serialHandler?.disconnect()
})

ipcMain.handle('serial:send', async (_, cmd) => {
  return await serialHandler?.sendCommand(cmd)
})

// Mock mode toggle
ipcMain.handle('mock:enable', () => {
  serialHandler?.enableMock()
  return true
})

ipcMain.handle('mock:disable', () => {
  serialHandler?.disableMock()
  return true
})

// Flash firmware
ipcMain.handle('flash:upload', async (_, { port, binPath }) => {
  return await serialHandler?.flashFirmware(port, binPath, (log) => {
    mainWindow?.webContents.send('flash:log', log)
  })
})

// File system
ipcMain.handle('fs:save-file', async (_, { filePath, content }) => {
  fs.writeFileSync(filePath, content, 'utf-8')
  return true
})

ipcMain.handle('fs:read-file', async (_, filePath) => {
  return fs.readFileSync(filePath, 'utf-8')
})

ipcMain.handle('fs:show-save-dialog', async (_, options) => {
  return await dialog.showSaveDialog(mainWindow, options)
})

ipcMain.handle('fs:show-open-dialog', async (_, options) => {
  return await dialog.showOpenDialog(mainWindow, options)
})
