import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const EonixContext = createContext(null)

export function EonixProvider({ children }) {
  const [connected, setConnected] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [modules, setModules] = useState([])
  const [moduleConfigs, setModuleConfigs] = useState({}) // { [moduleId]: { function, params } }
  const [telemetry, setTelemetry] = useState(null)
  const [mockMode, setMockMode] = useState(false)
  const [generatedFiles, setGeneratedFiles] = useState(null)
  const [logs, setLogs] = useState([])
  const listenersRegistered = useRef(false)

  const addLog = useCallback((msg, type = 'info') => {
    setLogs(prev => [...prev.slice(-200), { text: msg, type, time: Date.now() }])
  }, [])

  useEffect(() => {
    if (!window.eonix || listenersRegistered.current) return
    listenersRegistered.current = true

    const api = window.eonix.serial

    const onConnected = (data) => {
      setConnected(true)
      setDeviceInfo(data)
      addLog(`Eonix Motherboard connected on ${data.port}${data.mock ? ' (MOCK)' : ''}`, 'success')
    }

    const onDisconnected = () => {
      setConnected(false)
      setDeviceInfo(null)
      setModules([])
      setTelemetry(null)
      addLog('Device disconnected', 'info')
    }

    const onModuleList = (mods) => {
      setModules(mods)
      addLog(`Discovered ${mods.length} module(s)`, 'success')
    }

    const onLog = (msg) => addLog(msg, 'info')

    const onTelemetry = (data) => {
      setTelemetry(data)
    }

    api.onDeviceConnected(onConnected)
    api.onDeviceDisconnected(onDisconnected)
    api.onModuleList(onModuleList)
    api.onTelemetry(onTelemetry)
    api.onLog(onLog)

    return () => {
      // Clean up all IPC listeners on unmount
      api.removeAllListeners('device:connected')
      api.removeAllListeners('device:disconnected')
      api.removeAllListeners('modules:list')
      api.removeAllListeners('device:log')
      api.removeAllListeners('telemetry:update')
      listenersRegistered.current = false
    }
  }, [addLog])

  const setModuleConfig = useCallback((moduleId, config) => {
    setModuleConfigs(prev => ({ ...prev, [moduleId]: config }))
  }, [])

  const applyModuleConfig = useCallback(async (module) => {
    try {
      if (!window.eonix?.serial) return false
      if (!connected) return false
      if (!module) return false

      const config = moduleConfigs[module.id] || { function: '', params: {} }
      if (!config.function) return false

      const def = module.functions.find(f => f.name === config.function)
      if (!def) return false

      // Validate required parameters exist
      const canApply = def.parameters.every(p => config.params[p.name] !== undefined && config.params[p.name] !== '')
      if (!canApply) return false

      const ok = await window.eonix.serial.send({
        cmd: 'set_module_config',
        moduleId: module.id,
        function: config.function,
        params: config.params,
      })

      if (ok) addLog(`Applied config to ${module.name}`, 'success')
      else addLog(`Failed to apply config to ${module.name}`, 'error')

      return !!ok
    } catch (e) {
      addLog(`Failed to apply config: ${e.message}`, 'error')
      return false
    }
  }, [connected, moduleConfigs, addLog])

  const toggleMock = useCallback(async () => {
    if (!window.eonix) return
    if (!mockMode) {
      await window.eonix.mock.enable()
      setMockMode(true)
    } else {
      await window.eonix.mock.disable()
      setMockMode(false)
      setConnected(false)
      setDeviceInfo(null)
      setModules([])
    }
  }, [mockMode])

  const startTelemetry = useCallback(async (opts = {}) => {
    if (!window.eonix?.serial) return
    const interval_ms = Number(opts.interval_ms ?? 100)
    await window.eonix.serial.send({
      cmd: 'telemetry_start',
      interval_ms,
    })
  }, [])

  const stopTelemetry = useCallback(async () => {
    if (!window.eonix?.serial) return
    await window.eonix.serial.send({ cmd: 'telemetry_stop' })
  }, [])

  return (
    <EonixContext.Provider value={{
      connected, deviceInfo, modules, moduleConfigs, setModuleConfig,
      telemetry, startTelemetry, stopTelemetry,
      applyModuleConfig,
      mockMode, toggleMock, generatedFiles, setGeneratedFiles, logs, addLog
    }}>
      {children}
    </EonixContext.Provider>
  )
}

export function useEonix() {
  const ctx = useContext(EonixContext)
  if (!ctx) throw new Error('useEonix must be inside EonixProvider')
  return ctx
}
