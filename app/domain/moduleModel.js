export const CUSTOM_ROLE_VALUE = 'CUSTOM_ROLE_NAME'

export const ROLE_OPTIONS = [
  'test_module_1',
  'LEFT_MOTOR',
  'RIGHT_MOTOR',
  'MAIN_PDS',
  'FRONT_TOF',
  CUSTOM_ROLE_VALUE,
]

const STATUS_BADGE_CLASS = {
  ACTIVE: 'badge-green',
  MISSING: 'badge-red',
  FAULT: 'badge-red',
  UNCONFIGURED: 'badge-yellow',
  NEW: 'badge-yellow',
  REPLACED: 'badge-blue',
}

const TELEMETRY_LABELS = {
  distance_mm: 'Distance (mm)',
  current_a: 'Current (A)',
  fault: 'Fault',
  voltage_v: 'Voltage (V)',
  temperature_c: 'Temperature (C)',
  gyro_x_centi_dps: 'Gyro X (cdeg/s)',
  gyro_y_centi_dps: 'Gyro Y (cdeg/s)',
  gpio_pin_mask: 'GPIO mask',
  gpio_pwm_duty: 'PWM duty',
  letter: 'Letter',
  number: 'Number',
  led: 'LED',
  ledState: 'LED',
  online: 'Online',
}

export function normalizeRole(role) {
  return String(role || '').trim().replace(/[^A-Za-z0-9_]/g, '_')
}

export function getModuleKey(module) {
  return module?.uid || String(module?.id ?? '')
}

export function displayCanId(runtimeCanId) {
  if (typeof runtimeCanId === 'number') {
    return `0x${runtimeCanId.toString(16).toUpperCase().padStart(2, '0')}`
  }
  return runtimeCanId || 'unassigned'
}

export function normalizeModule(module) {
  const uid = module.uid || module.uid96 || module.uidHash || `MODULE_${module.id ?? 'UNKNOWN'}`
  const descriptor = module.descriptor || module.moduleType || module.type || 'CUSTOM'
  const runtimeCanId = module.runtimeCanId ?? module.canId ?? module.current_can_id ?? module.node_id ?? module.id
  const isTestModule = descriptor === 'TEST_LETTER_NUMBER'
  const role = module.role || (isTestModule ? 'test_module_1' : '')
  const led = Boolean(module.led ?? module.ledState ?? module.config?.led ?? false)

  return {
    ...module,
    id: module.id ?? uid,
    uid,
    descriptor,
    moduleType: descriptor,
    runtimeCanId,
    canId: displayCanId(runtimeCanId),
    nodeId: module.nodeId ?? module.node_id ?? runtimeCanId,
    node_id: module.node_id ?? module.nodeId ?? runtimeCanId,
    runtime_cmd_id: module.runtime_cmd_id ?? module.runtimeCommandId ?? module.commandCanId,
    runtime_data_id: module.runtime_data_id ?? module.runtimeDataId ?? module.dataCanId,
    role,
    status: (module.status || (module.online === false ? 'OFFLINE' : 'ACTIVE')).toUpperCase(),
    online: module.online ?? module.status !== 'OFFLINE',
    firmwareVersion: module.firmwareVersion || module.firmware || module.fwVersion || 'unknown',
    hardwareVersion: module.hardwareVersion || module.hardware || module.hwVersion || 'unknown',
    capabilities: module.capabilities || [],
    letter: String(module.letter ?? module.config?.letter ?? 'A').slice(0, 1),
    number: Number(module.number ?? module.config?.number ?? 123),
    led,
    ledState: led,
    config: {
      ...(module.config || {}),
      ...(isTestModule ? {
        letter: String(module.letter ?? module.config?.letter ?? 'A').slice(0, 1),
        number: Number(module.number ?? module.config?.number ?? 123),
        led,
      } : {}),
    },
  }
}

export function inferModuleProfile(module) {
  const descriptor = String(module?.descriptor || module?.moduleType || module?.type || '').toUpperCase()
  if (descriptor === 'TEST_LETTER_NUMBER') return 'TEST_LETTER_NUMBER'
  if (descriptor.includes('MOTOR') || descriptor.includes('ACTUATOR')) return 'MOTOR'
  if (descriptor.includes('PDS') || descriptor.includes('POWER')) return 'PDS'
  if (descriptor.includes('TOF') || descriptor.includes('DISTANCE') || descriptor.includes('SENSOR')) return 'TOF'
  return 'CUSTOM'
}

export function isRoleCompatible(role, module) {
  const normalizedRole = normalizeRole(role)
  if (!normalizedRole) return false

  const profile = inferModuleProfile(module)
  if (profile === 'TEST_LETTER_NUMBER') return /^[A-Za-z_][A-Za-z0-9_]{0,31}$/.test(role)
  if (normalizedRole === 'LEFT_MOTOR' || normalizedRole === 'RIGHT_MOTOR') return profile === 'MOTOR'
  if (normalizedRole === 'MAIN_PDS') return profile === 'PDS'
  if (normalizedRole === 'FRONT_TOF') return profile === 'TOF'

  return /^[A-Z][A-Z0-9_]{2,31}$/.test(normalizedRole)
}

export function statusClass(status) {
  return STATUS_BADGE_CLASS[String(status || '').toUpperCase()] || 'badge-purple'
}

export function getTelemetryValues(entry = {}) {
  return Object.entries(entry)
    .filter(([key]) => key !== 'last_update_ms')
    .map(([key, value]) => ({
      key,
      label: TELEMETRY_LABELS[key] || key.replace(/_/g, ' '),
      value,
    }))
}
