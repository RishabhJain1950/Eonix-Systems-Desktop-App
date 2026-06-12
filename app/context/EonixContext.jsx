import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getModuleKey, isRoleCompatible, normalizeModule } from '../domain/moduleModel'
import {
  SAM_COMMANDS,
  createIdentifyCommand,
  createReplacementCommand,
  createRoleConfigCommand,
} from '../domain/samCommands'

const EonixContext = createContext(null)

export { getModuleKey, isRoleCompatible, normalizeModule }

export function EonixProvider({ children }) {
  const [connected, setConnected] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [modules, setModules] = useState([])
  const [moduleConfigs, setModuleConfigs] = useState({})
  const [telemetry, setTelemetry] = useState(null)
  const [generatedFiles, setGeneratedFiles] = useState(null)
  const [logs, setLogs] = useState([])
  const listenersRegistered = useRef(false)
  const telemetryPollInterval = useRef(null)

  const addLog = useCallback((message, type = 'info') => {
    setLogs((previousLogs) => [
      ...previousLogs.slice(-200),
      { text: message, type, time: Date.now() },
    ])
  }, [])

  useEffect(() => {
    if (!window.eonix?.serial || listenersRegistered.current) return
    listenersRegistered.current = true

    const serialApi = window.eonix.serial

    function onConnected(data) {
      setConnected(true)
      setDeviceInfo(data)
      addLog(`SAM connected on ${data.port}`, 'success')
    }

    function onDisconnected() {
      setConnected(false)
      setDeviceInfo(null)
      setModules([])
      setTelemetry(null)
      addLog('SAM disconnected', 'info')
    }

    function onModuleList(rawModules = []) {
      const normalizedModules = rawModules.map(normalizeModule)
      setModules(normalizedModules)
      addLog(`Discovered ${normalizedModules.length} module(s)`, 'success')
    }

    serialApi.onDeviceConnected(onConnected)
    serialApi.onDeviceDisconnected(onDisconnected)
    serialApi.onModuleList(onModuleList)
    serialApi.onTelemetry(setTelemetry)
    serialApi.onLog((message) => addLog(message, 'info'))

    return () => {
      serialApi.removeAllListeners('device:connected')
      serialApi.removeAllListeners('device:disconnected')
      serialApi.removeAllListeners('modules:list')
      serialApi.removeAllListeners('device:log')
      serialApi.removeAllListeners('telemetry:update')
      listenersRegistered.current = false
    }
  }, [addLog])

  const setModuleConfig = useCallback((moduleId, config) => {
    setModuleConfigs((previousConfigs) => ({
      ...previousConfigs,
      [moduleId]: config,
    }))
  }, [])

  const applyModuleConfig = useCallback(async (module) => {
    try {
      if (!connected || !module || !window.eonix?.serial) return false

      const moduleKey = getModuleKey(module)
      const roleConfig = moduleConfigs[moduleKey] || {
        role: module.role || '',
        config: module.config || {},
      }

      if (!roleConfig.role) return false
      if (!isRoleCompatible(roleConfig.role, module)) {
        addLog(`Role ${roleConfig.role} is not compatible with ${module.descriptor}`, 'error')
        return false
      }

      const ok = await window.eonix.serial.send(createRoleConfigCommand(module, roleConfig))
      if (ok) {
        setModules((previousModules) => previousModules.map((currentModule) => (
          getModuleKey(currentModule) === moduleKey
            ? {
                ...currentModule,
                role: roleConfig.role,
                letter: roleConfig.config?.letter ?? currentModule.letter,
                number: Number(roleConfig.config?.number ?? currentModule.number),
                led: Boolean(roleConfig.config?.led ?? currentModule.led),
                ledState: Boolean(roleConfig.config?.led ?? currentModule.ledState),
                config: roleConfig.config || currentModule.config,
              }
            : currentModule
        )))
        addLog(`Sent config for ${roleConfig.role}`, 'success')
      } else {
        addLog(`Failed to send config for ${module.uid}`, 'error')
      }

      return !!ok
    } catch (error) {
      addLog(`Failed to send module config: ${error.message}`, 'error')
      return false
    }
  }, [addLog, connected, moduleConfigs])

  const identifyModule = useCallback(async (module) => {
    if (!window.eonix?.serial || !connected || !module) return false
    return await window.eonix.serial.send(createIdentifyCommand(module))
  }, [connected])

  const confirmReplacement = useCallback(async (missingModule, candidateModule) => {
    if (!window.eonix?.serial || !connected || !missingModule || !candidateModule) return false

    const ok = await window.eonix.serial.send(createReplacementCommand(missingModule, candidateModule))
    if (ok) {
      addLog(`Replacement confirmed: ${missingModule.role} moved to ${candidateModule.uid}`, 'success')
    }
    return !!ok
  }, [addLog, connected])

  const startTelemetry = useCallback(async (options = {}) => {
    if (telemetryPollInterval.current) clearInterval(telemetryPollInterval.current)
    telemetryPollInterval.current = null

    if (!connected || !window.eonix?.serial) return

    const intervalMs = Number(options.interval_ms ?? 500)
    await window.eonix.serial.send({ cmd: SAM_COMMANDS.GET_TELEMETRY })
    telemetryPollInterval.current = setInterval(() => {
      window.eonix?.serial?.send({ cmd: SAM_COMMANDS.GET_TELEMETRY })
    }, intervalMs)
  }, [connected])

  const stopTelemetry = useCallback(async () => {
    if (telemetryPollInterval.current) clearInterval(telemetryPollInterval.current)
    telemetryPollInterval.current = null
  }, [])

  return (
    <EonixContext.Provider value={{
      addLog,
      applyModuleConfig,
      confirmReplacement,
      connected,
      deviceInfo,
      generatedFiles,
      identifyModule,
      logs,
      moduleConfigs,
      modules,
      setGeneratedFiles,
      setModuleConfig,
      startTelemetry,
      stopTelemetry,
      telemetry,
    }}>
      {children}
    </EonixContext.Provider>
  )
}

export function useEonix() {
  const context = useContext(EonixContext)
  if (!context) throw new Error('useEonix must be inside EonixProvider')
  return context
}
