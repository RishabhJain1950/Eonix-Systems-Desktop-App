const { SerialPort } = require('serialport')
const { spawn } = require('child_process')
const { EventEmitter } = require('events')
const IPC = require('../shared/protocol')

const BAUD_RATE = 115200
const DISCOVERY_INTERVAL_MS = 2000
const PING_INTERVAL_MS = 1000
const PING_TIMEOUT_MS = 5000
const MODULE_POLL_INTERVAL_MS = 1500

// Current bring-up hardware exposes STMicroelectronics USB CDC ports. Keep the
// list narrow so random serial devices are not marked as Eonix before ping/pong.
const EONIX_VENDOR_ID = '0483'
const EONIX_PRODUCT_IDS = new Set([
  '5740',
  '374b',
  '374e',
  '374f',
  '3753',
  '3754',
])

function isLikelyEonixPort(portInfo) {
  const vendorId = String(portInfo.vendorId || '').toLowerCase()
  const productId = String(portInfo.productId || '').toLowerCase()
  return vendorId === EONIX_VENDOR_ID && EONIX_PRODUCT_IDS.has(productId)
}

class JsonLineParser extends EventEmitter {
  constructor() {
    super()
    this.buffer = ''
  }

  feed(chunk) {
    this.buffer += chunk.toString('utf-8')

    let newlineIndex = this.buffer.indexOf('\n')
    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim()
      this.buffer = this.buffer.slice(newlineIndex + 1)
      newlineIndex = this.buffer.indexOf('\n')

      if (!line) continue

      try {
        this.emit('message', JSON.parse(line))
      } catch {
        this.emit('parse-error', line)
      }
    }
  }
}

class SerialHandler {
  constructor(mainWindow) {
    this.window = mainWindow
    this.port = null
    this.pendingPortPath = null
    this.parser = new JsonLineParser()
    this.samConnected = false
    this.modulePollInterval = null
    this.pingInterval = null
    this.pingTimeout = null
    this.watchInterval = null

    this.parser.on('message', (message) => this.handleMessage(message))
    this.parser.on('parse-error', (line) => this.log(`Invalid JSON from SAM: ${line}`))

    this.startPortWatcher()
  }

  startPortWatcher() {
    this.watchInterval = setInterval(async () => {
      if (this.port || this.pendingPortPath) return

      try {
        const ports = await SerialPort.list()
        const candidate = ports.find(isLikelyEonixPort)
        if (candidate) await this.connect(candidate.path)
      } catch (error) {
        this.log(`Port scan failed: ${error.message}`)
      }
    }, DISCOVERY_INTERVAL_MS)
  }

  async listPorts() {
    const ports = await SerialPort.list()
    return ports.map((portInfo) => ({
      path: portInfo.path,
      manufacturer: portInfo.manufacturer,
      vendorId: portInfo.vendorId,
      productId: portInfo.productId,
      isEonix: isLikelyEonixPort(portInfo),
    }))
  }

  async connect(portPath) {
    if (!portPath) throw new Error('No serial port path provided')
    if (this.port) await this.disconnect()

    this.pendingPortPath = portPath

    return new Promise((resolve, reject) => {
      const port = new SerialPort({ path: portPath, baudRate: BAUD_RATE }, (error) => {
        if (error) {
          this.pendingPortPath = null
          this.port = null
          reject(error)
          return
        }

        this.port = port
        this.pendingPortPath = null
        this.samConnected = false
        this.parser.buffer = ''

        port.on('data', (data) => this.parser.feed(data))
        port.on('close', () => this.handleDisconnect())
        port.on('error', (portError) => this.log(`Serial error on ${portPath}: ${portError.message}`))

        this.log(`Serial port opened on ${portPath}; waiting for SAM ping response`)
        this.startPingHandshake()
        resolve({ port: portPath })
      })
    })
  }

  async disconnect() {
    this.stopPingHandshake()
    this.stopModulePolling()

    if (this.port?.isOpen) {
      await new Promise((resolve) => this.port.close(resolve))
    }

    this.port = null
    this.pendingPortPath = null
    this.samConnected = false
    this.window?.webContents.send(IPC.DEVICE_DISCONNECTED, {})
    return true
  }

  async sendCommand(command) {
    if (!this.port?.isOpen) return false

    const line = `${JSON.stringify(command)}\n`
    return new Promise((resolve, reject) => {
      this.port.write(line, 'utf-8', (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve(true)
      })
    })
  }

  startPingHandshake() {
    this.stopPingHandshake()

    const pingSam = () => {
      this.sendCommand({ cmd: IPC.CMD_PING }).catch((error) => {
        this.log(`SAM ping failed: ${error.message}`)
      })
    }

    pingSam()
    this.pingInterval = setInterval(pingSam, PING_INTERVAL_MS)
    this.pingTimeout = setTimeout(() => {
      if (!this.samConnected) {
        this.log('No EONIX_SAM pong received; closing serial port')
        this.disconnect().catch((error) => this.log(`Disconnect failed: ${error.message}`))
      }
    }, PING_TIMEOUT_MS)
  }

  stopPingHandshake() {
    if (this.pingInterval) clearInterval(this.pingInterval)
    if (this.pingTimeout) clearTimeout(this.pingTimeout)
    this.pingInterval = null
    this.pingTimeout = null
  }

  startModulePolling() {
    this.stopModulePolling()

    const requestModules = () => {
      if (!this.samConnected) return
      this.sendCommand({ cmd: IPC.CMD_GET_MODULES }).catch((error) => {
        this.log(`Module registry refresh failed: ${error.message}`)
      })
    }

    requestModules()
    this.modulePollInterval = setInterval(requestModules, MODULE_POLL_INTERVAL_MS)
  }

  stopModulePolling() {
    if (this.modulePollInterval) clearInterval(this.modulePollInterval)
    this.modulePollInterval = null
  }

  handleMessage(message) {
    switch (message.cmd) {
      case 'pong':
        this.handlePong(message)
        break
      case 'module_list':
        this.handleModuleList(message)
        break
      case 'telemetry':
        this.window?.webContents.send(IPC.TELEMETRY_UPDATE, normalizeTelemetry(message))
        break
      case 'config_ack':
        this.log(`Config ${message.ok ? 'accepted' : 'rejected'} for ${message.role || 'unknown role'}`)
        break
      case 'log':
        this.log(message.message || 'SAM log message')
        break
      case 'ack':
        this.log(`ACK: ${message.ref || 'command'}${message.ok === false ? ' failed' : ''}`)
        break
      default:
        this.log(`RX: ${String(message.cmd || 'unknown')}`)
    }
  }

  handlePong(message) {
    if (message.device !== 'EONIX_SAM') {
      this.log(`Ignoring pong from ${message.device || 'unknown device'}`)
      return
    }

    const firstConnection = !this.samConnected
    this.samConnected = true
    this.stopPingHandshake()

    const deviceInfo = {
      port: this.port?.path || 'unknown',
      device: message.device,
      firmware: message.fw || message.firmware || 'unknown',
      fw: message.fw || message.firmware || 'unknown',
      transport: message.transport || 'usb_cdc',
    }

    this.window?.webContents.send(IPC.DEVICE_CONNECTED, deviceInfo)
    this.log(`SAM connected on ${deviceInfo.port} (${deviceInfo.fw}, ${deviceInfo.transport})`)

    if (firstConnection) this.startModulePolling()
  }

  handleModuleList(message) {
    const modules = Array.isArray(message.modules) ? message.modules : []
    this.window?.webContents.send(IPC.MODULES_LIST, modules)
    this.log(`Module list received (${modules.length})`)
  }

  handleDisconnect() {
    this.stopPingHandshake()
    this.stopModulePolling()

    const wasConnected = this.samConnected || this.port
    this.port = null
    this.pendingPortPath = null
    this.samConnected = false

    if (wasConnected) this.window?.webContents.send(IPC.DEVICE_DISCONNECTED, {})
  }

  log(message) {
    this.window?.webContents.send(IPC.DEVICE_LOG, message)
  }

  async flashFirmware(port, binPath, onLog) {
    return new Promise((resolve, reject) => {
      const args = ['-c', `port=${port}`, '-w', binPath, '0x08000000', '-v', '-rst']
      const child = spawn('STM32_Programmer_CLI', args)

      child.stdout.on('data', (data) => onLog({ type: 'stdout', text: data.toString() }))
      child.stderr.on('data', (data) => onLog({ type: 'stderr', text: data.toString() }))

      child.on('close', (code) => {
        if (code === 0) resolve({ success: true })
        else reject(new Error(`Programmer exited with code ${code}`))
      })

      child.on('error', (error) => {
        onLog({
          type: 'error',
          text: `STM32_Programmer_CLI not found. Install STM32CubeProgrammer and add it to PATH.\n${error.message}`,
        })
        reject(error)
      })
    })
  }

  async destroy() {
    if (this.watchInterval) clearInterval(this.watchInterval)
    await this.disconnect()
  }
}

function normalizeTelemetry(message) {
  if (message.data?.modulesById) return message.data

  const modulesById = {}
  const sourceModules = Array.isArray(message.modules) ? message.modules : [message]

  sourceModules.forEach((module, index) => {
    const entry = {
      role: module.role,
      type: module.type || module.descriptor,
      letter: module.letter,
      number: module.number,
      led: module.led ?? module.ledState,
      ledState: module.ledState ?? module.led,
      online: module.online,
      last_update_ms: Date.now(),
    }

    const primaryKey = module.role || module.uid || String(module.id ?? index)
    modulesById[primaryKey] = entry
    if (module.uid) modulesById[module.uid] = entry
    if (module.role) modulesById[module.role] = entry
  })

  return { modulesById }
}

module.exports = { SerialHandler, isLikelyEonixPort }
