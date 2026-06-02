const { SerialPort } = require('serialport')
const { spawn } = require('child_process')
const { EventEmitter } = require('events')

// The Eonix motherboard VID:PID — update when hardware is finalized.
// During bring-up we accept common STLink/VCP PIDs so Nucleo boards auto-detect.
const EONIX_VID = '0483' // STMicroelectronics
const EONIX_PIDS = new Set([
  '5740', // STM32 native USB CDC VCP (not used by current G491 firmware)
  '374b', // ST-LINK/V2-1 Virtual COM Port
  '374e', // ST-LINK-V3E VCP (NUCLEO-G491RE on-board programmer)
  '374f', // ST-LINK-V3 VCP (variant)
  '3753', // ST-LINK-V3 VCP (variant)
  '3754', // ST-LINK-V3 VCP (variant)
])

function isEonixPort(p) {
  const vid = p.vendorId?.toLowerCase()
  const pid = p.productId?.toLowerCase()
  return vid === EONIX_VID && (pid ? EONIX_PIDS.has(pid) : false)
}

const BAUD_RATE = 115200

/**
 * Framed packet format: [4-byte little-endian length][JSON payload]
 */
class FramedParser extends EventEmitter {
  constructor() {
    super()
    this._buffer = Buffer.alloc(0)
  }

  feed(data) {
    this._buffer = Buffer.concat([this._buffer, data])
    while (this._buffer.length >= 4) {
      const len = this._buffer.readUInt32LE(0)
      if (this._buffer.length < 4 + len) break
      const payload = this._buffer.slice(4, 4 + len).toString('utf-8')
      this._buffer = this._buffer.slice(4 + len)
      try {
        const msg = JSON.parse(payload)
        this.emit('message', msg)
      } catch {
        console.error('[SerialHandler] Bad JSON:', payload)
      }
    }
  }
}

class SerialHandler {
  constructor(mainWindow) {
    this._win = mainWindow
    this._port = null
    this._parser = new FramedParser()
    this._mockMode = false
    this._mockInterval = null
    this._mockTelemetryInterval = null
    this._mockModules = null
    this._connected = false
    this._hasModuleList = false
    this._modulePollInterval = null
    this._modulePollDeadline = 0

    this._parser.on('message', (msg) => this._handleMessage(msg))

    // Start watching for device plug/unplug
    this._startPortWatcher()
  }

  // ─── Port Watcher ────────────────────────────────────────────────────────────

  _startPortWatcher() {
    this._watchInterval = setInterval(async () => {
      if (this._mockMode) return
      const ports = await SerialPort.list()
      const eonixPort = ports.find(
        (p) => isEonixPort(p)
      )

      if (eonixPort && !this._connected) {
        this._autoConnect(eonixPort.path)
      } else if (!eonixPort && this._connected) {
        this._handleDisconnect()
      }
    }, 2000)
  }

  async _autoConnect(portPath) {
    try {
      await this.connect(portPath)
      console.log('[SerialHandler] Auto-connected to', portPath)
    } catch (e) {
      console.error('[SerialHandler] Auto-connect failed:', e.message)
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  async listPorts() {
    const ports = await SerialPort.list()
    return ports.map((p) => ({
      path: p.path,
      manufacturer: p.manufacturer,
      vendorId: p.vendorId,
      productId: p.productId,
      isEonix: isEonixPort(p),
    }))
  }

  async connect(portPath) {
    if (this._port) await this.disconnect()

    return new Promise((resolve, reject) => {
      this._port = new SerialPort({ path: portPath, baudRate: BAUD_RATE }, (err) => {
        if (err) {
          this._port = null
          reject(err)
          return
        }
        this._connected = true
        this._hasModuleList = false
        this._modulePollDeadline = Date.now() + 15000 // keep discovering for 15s
        this._port.on('data', (data) => this._parser.feed(data))
        this._port.on('close', () => this._handleDisconnect())
        this._port.on('error', (e) => console.error('[SerialHandler] Port error:', e.message))

        // Request module list immediately, then keep polling for a short discovery window.
        setTimeout(() => this.sendCommand({ cmd: 'get_modules' }), 250)
        if (this._modulePollInterval) clearInterval(this._modulePollInterval)
        this._modulePollInterval = setInterval(() => {
          if (!this._connected || this._mockMode) return
          if (Date.now() > this._modulePollDeadline) {
            clearInterval(this._modulePollInterval)
            this._modulePollInterval = null
            return
          }
          this.sendCommand({ cmd: 'get_modules' })
        }, 1500)

        this._win?.webContents.send('device:connected', { port: portPath })
        resolve({ port: portPath })
      })
    })
  }

  async disconnect() {
    if (this._port && this._port.isOpen) {
      await new Promise((res) => this._port.close(res))
    }
    this._port = null
    this._connected = false
    return true
  }

  async sendCommand(cmd) {
    // In mock mode, we simulate commands locally so UI features still work.
    if (this._mockMode) {
      try {
        if (cmd?.cmd === 'telemetry_start') {
          const interval_ms = Number(cmd.interval_ms ?? 100)
          this._startMockTelemetry(interval_ms)
          return true
        }
        if (cmd?.cmd === 'telemetry_stop') {
          this._stopMockTelemetry()
          return true
        }
        if (cmd?.cmd === 'set_module_config') {
          // Pretend config was applied successfully in mock mode.
          return true
        }
        if (cmd?.cmd === 'get_modules') {
          // module_list is pushed by enableMock(); keep as no-op.
          return true
        }
      } catch {
        return false
      }
      return true
    }

    if (!this._port?.isOpen) return false
    const json = JSON.stringify(cmd)
    const buf = Buffer.alloc(4 + json.length)
    buf.writeUInt32LE(json.length, 0)
    buf.write(json, 4, 'utf-8')
    return new Promise((res, rej) => this._port.write(buf, (err) => err ? rej(err) : res(true)))
  }

  // ─── Message Handler ─────────────────────────────────────────────────────────

  _handleMessage(msg) {
    switch (msg.cmd) {
      case 'module_list':
        this._hasModuleList = true
        this._win?.webContents.send('modules:list', msg.modules)
        this._win?.webContents.send('device:log', `Module list received (${msg.modules?.length ?? 0})`)
        break
      case 'telemetry':
        this._win?.webContents.send('telemetry:update', msg.data)
        break
      case 'log':
        this._win?.webContents.send('device:log', msg.message)
        break
      case 'ack':
        console.log('[SerialHandler] ACK:', msg.ref)
        this._win?.webContents.send('device:log', `ACK: ${msg.ref}${msg.ok === false ? ' (error)' : ''}`)
        break
      default:
        console.log('[SerialHandler] Unknown cmd:', msg.cmd)
        this._win?.webContents.send('device:log', `RX: ${String(msg.cmd ?? 'unknown')}`)
    }
  }

  _handleDisconnect() {
    this._connected = false
    this._port = null
    this._hasModuleList = false
    if (this._modulePollInterval) {
      clearInterval(this._modulePollInterval)
      this._modulePollInterval = null
    }
    this._win?.webContents.send('device:disconnected', {})
  }

  // ─── Mock Mode ───────────────────────────────────────────────────────────────

  enableMock() {
    this._mockMode = true
    this._connected = true

    const mockModules = [
      {
        id: 1, type: 'lidar', name: 'Eonix Lidar X1', canId: '0x01',
        functions: [
          { name: 'distance_measurement', parameters: [{ name: 'sampling_rate', type: 'int', default: 50 }] },
          { name: 'object_detection', parameters: [{ name: 'threshold', type: 'float', default: 0.5 }] },
        ],
      },
      {
        id: 2, type: 'imu', name: 'Eonix IMU-6X', canId: '0x02',
        functions: [
          { name: 'attitude_estimation', parameters: [{ name: 'filter_gain', type: 'float', default: 0.1 }, { name: 'update_rate_hz', type: 'int', default: 100 }] },
          { name: 'vibration_monitor', parameters: [{ name: 'threshold_g', type: 'float', default: 2.0 }] },
        ],
      },
      {
        id: 3, type: 'temperature', name: 'Eonix TempSense Pro', canId: '0x03',
        functions: [
          { name: 'temperature_monitor', parameters: [{ name: 'sample_interval_ms', type: 'int', default: 1000 }, { name: 'alert_threshold_c', type: 'float', default: 85.0 }] },
        ],
      },
      {
        id: 4, type: 'gpio', name: 'Eonix GPIO-16', canId: '0x04',
        functions: [
          { name: 'digital_output', parameters: [{ name: 'pin_mask', type: 'int', default: 255 }] },
          { name: 'pwm_output', parameters: [{ name: 'frequency_hz', type: 'int', default: 1000 }, { name: 'duty_cycle', type: 'float', default: 0.5 }] },
        ],
      },
    ]

    this._mockModules = mockModules

    // Fire device connected then module list
    setTimeout(() => {
      this._win?.webContents.send('device:connected', { port: 'MOCK', firmware: 'v1.0.0-mock', mock: true })
      setTimeout(() => {
        this._win?.webContents.send('modules:list', mockModules)
      }, 800)
    }, 500)
  }

  disableMock() {
    this._mockMode = false
    this._connected = false
    if (this._mockInterval) clearInterval(this._mockInterval)
    this._stopMockTelemetry()
    this._win?.webContents.send('device:disconnected', {})
  }

  _startMockTelemetry(interval_ms) {
    if (this._mockTelemetryInterval) clearInterval(this._mockTelemetryInterval)
    const mods = this._mockModules || []
    if (!mods.length) return

    // Immediate tick so UI updates right away.
    this._pushMockTelemetry(mods)

    this._mockTelemetryInterval = setInterval(() => {
      this._pushMockTelemetry(mods)
    }, interval_ms)
  }

  _stopMockTelemetry() {
    if (this._mockTelemetryInterval) clearInterval(this._mockTelemetryInterval)
    this._mockTelemetryInterval = null
  }

  _pushMockTelemetry(mods) {
    const now = Date.now()
    const t = now / 1000

    const modulesById = {}
    mods.forEach((m) => {
      const idKey = String(m.id)
      const entry = { last_update_ms: now }

      if (m.type === 'lidar') {
        // distance around 1200mm with slight wave
        entry.distance_mm = Math.round(1200 + 120 * Math.sin(t))
      }
      if (m.type === 'imu') {
        // gyro around +/- 1000 cdeg/s
        entry.gyro_x_centi_dps = Math.round(800 * Math.sin(t * 0.7))
        entry.gyro_y_centi_dps = Math.round(800 * Math.cos(t * 0.9))
      }
      if (m.type === 'temperature') {
        entry.temperature_c = Math.round(35 + 3 * Math.sin(t * 0.2) * 10) / 10
      }
      if (m.type === 'gpio') {
        entry.gpio_pin_mask = 255
        entry.gpio_pwm_duty = 0.5
      }

      modulesById[idKey] = entry
    })

    this._win?.webContents.send('telemetry:update', { modulesById })
  }

  // ─── Flash Firmware ──────────────────────────────────────────────────────────

  async flashFirmware(port, binPath, onLog) {
    return new Promise((resolve, reject) => {
      const args = ['-c', `port=${port}`, '-w', binPath, '0x08000000', '-v', '-rst']
      const child = spawn('STM32_Programmer_CLI', args)

      child.stdout.on('data', (d) => onLog({ type: 'stdout', text: d.toString() }))
      child.stderr.on('data', (d) => onLog({ type: 'stderr', text: d.toString() }))

      child.on('close', (code) => {
        if (code === 0) resolve({ success: true })
        else reject(new Error(`Programmer exited with code ${code}`))
      })

      child.on('error', (err) => {
        onLog({ type: 'error', text: `STM32_Programmer_CLI not found. Install STM32CubeProgrammer and add it to PATH.\n${err.message}` })
        reject(err)
      })
    })
  }

  async destroy() {
    clearInterval(this._watchInterval)
    if (this._mockInterval) clearInterval(this._mockInterval)
    if (this._modulePollInterval) clearInterval(this._modulePollInterval)
    await this.disconnect()
  }
}

module.exports = { SerialHandler }
