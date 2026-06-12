export const SAM_COMMANDS = {
  PING: 'ping',
  GET_MODULES: 'get_modules',
  SET_CONFIG: 'set_config',
  SET_ROLE_CONFIG: 'set_role_config',
  IDENTIFY_MODULE: 'identify_module',
  CONFIRM_REPLACEMENT: 'confirm_replacement',
  GET_TELEMETRY: 'get_telemetry',
}

export function createRoleConfigCommand(module, roleConfig) {
  if (module.descriptor === 'TEST_LETTER_NUMBER') {
    return {
      cmd: SAM_COMMANDS.SET_CONFIG,
      role: roleConfig.role || module.role || 'test_module_1',
      letter: String(roleConfig.config?.letter ?? module.letter ?? 'A').slice(0, 1),
      number: Number(roleConfig.config?.number ?? module.number ?? 0),
      led: Boolean(roleConfig.config?.led ?? module.led ?? module.ledState ?? false),
    }
  }

  return {
    cmd: SAM_COMMANDS.SET_ROLE_CONFIG,
    uid: module.uid,
    moduleType: module.descriptor,
    runtimeCanId: module.runtimeCanId,
    role: roleConfig.role,
    config: roleConfig.config || {},
  }
}

export function createIdentifyCommand(module) {
  return {
    cmd: SAM_COMMANDS.IDENTIFY_MODULE,
    uid: module.uid,
  }
}

export function createReplacementCommand(missingModule, candidateModule) {
  return {
    cmd: SAM_COMMANDS.CONFIRM_REPLACEMENT,
    oldUid: missingModule.uid,
    newUid: candidateModule.uid,
  }
}
