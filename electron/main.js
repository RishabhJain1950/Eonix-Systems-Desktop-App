const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')
const { SerialHandler } = require('../device/serial-handler')
const IPC = require('../shared/protocol')

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
    frame: true,
    backgroundColor: '#0A0D14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: getIconPath(),
    show: false,
  })

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

  serialHandler = new SerialHandler(mainWindow)

  if (process.env.EONIX_SMOKE_TEST === '1') {
    mainWindow.webContents.once('did-finish-load', async () => {
      try {
        const result = await mainWindow.webContents.executeJavaScript(`
          (async () => {
            const hasBridge = Boolean(window.eonix && window.eonix.serial && window.eonix.fs);
            await new Promise((resolve) => setTimeout(resolve, 500));
            const moduleNavButton = Array.from(document.querySelectorAll('button'))
              .find((button) => button.textContent.includes('Modules'));
            if (moduleNavButton) moduleNavButton.click();
            await new Promise((resolve) => setTimeout(resolve, 500));
            let bodyText = document.body.innerText;
            const moduleDisconnectedState = bodyText.includes('Connect SAM over USB') || bodyText.includes('No Connection');

            const telemetryNavButton = Array.from(document.querySelectorAll('button'))
              .find((button) => button.textContent.includes('Telemetry'));
            if (telemetryNavButton) telemetryNavButton.click();
            await new Promise((resolve) => setTimeout(resolve, 300));
            bodyText = document.body.innerText;
            const telemetryDisconnectedState = bodyText.includes('Connect SAM over USB-CDC first.');

            const codegenNavButton = Array.from(document.querySelectorAll('button'))
              .find((button) => button.textContent.includes('Code Gen'));
            if (codegenNavButton) codegenNavButton.click();
            await new Promise((resolve) => setTimeout(resolve, 300));
            bodyText = document.body.innerText;
            const codegenDisconnectedState = bodyText.includes('Discover and configure modules from SAM before generating code.');

            return {
              hasBridge,
              clickedModulesNav: Boolean(moduleNavButton),
              clickedTelemetryNav: Boolean(telemetryNavButton),
              clickedCodegenNav: Boolean(codegenNavButton),
              moduleDisconnectedState,
              telemetryDisconnectedState,
              codegenDisconnectedState,
            };
          })()
        `)
        console.log(`[EONIX_SMOKE_TEST] ${JSON.stringify(result)}`)
        if (!result.hasBridge || !result.clickedModulesNav || !result.clickedTelemetryNav || !result.clickedCodegenNav || !result.moduleDisconnectedState || !result.telemetryDisconnectedState || !result.codegenDisconnectedState) {
          process.exitCode = 1
        }
      } catch (error) {
        console.error(`[EONIX_SMOKE_TEST] ${error.stack || error.message}`)
        process.exitCode = 1
      } finally {
        app.exit(process.exitCode || 0)
      }
    })
  }
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

ipcMain.on(IPC.WINDOW_MINIMIZE, () => mainWindow?.minimize())
ipcMain.on(IPC.WINDOW_MAXIMIZE, () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on(IPC.WINDOW_CLOSE, () => mainWindow?.close())

ipcMain.handle(IPC.SERIAL_LIST, async () => await serialHandler?.listPorts() ?? [])
ipcMain.handle(IPC.SERIAL_CONNECT, async (_, portPath) => await serialHandler?.connect(portPath))
ipcMain.handle(IPC.SERIAL_DISCONNECT, async () => await serialHandler?.disconnect())
ipcMain.handle(IPC.SERIAL_SEND, async (_, command) => await serialHandler?.sendCommand(command))

ipcMain.handle(IPC.FLASH_UPLOAD, async (_, { port, binPath }) => (
  await serialHandler?.flashFirmware(port, binPath, (log) => {
    mainWindow?.webContents.send(IPC.FLASH_LOG, log)
  })
))

ipcMain.handle(IPC.FS_SAVE, async (_, { filePath, content }) => {
  fs.writeFileSync(filePath, content, 'utf-8')
  return true
})

ipcMain.handle(IPC.FS_READ, async (_, filePath) => fs.readFileSync(filePath, 'utf-8'))
ipcMain.handle(IPC.FS_DIALOG_SAVE, async (_, options) => await dialog.showSaveDialog(mainWindow, options))
ipcMain.handle(IPC.FS_DIALOG_OPEN, async (_, options) => await dialog.showOpenDialog(mainWindow, options))
