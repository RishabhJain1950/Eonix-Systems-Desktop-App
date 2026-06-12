import { useMemo, useState } from 'react'
import {
  CUSTOM_ROLE_VALUE,
  ROLE_OPTIONS,
  getModuleKey,
  isRoleCompatible,
  statusClass,
} from '../../domain/moduleModel'
import { useEonix } from '../../context/EonixContext'

export default function ModuleCard({ module }) {
  if (module.descriptor === 'TEST_LETTER_NUMBER') {
    return <TestLetterNumberCard module={module} />
  }

  return <GenericModuleCard module={module} />
}

function GenericModuleCard({ module }) {
  const { moduleConfigs, setModuleConfig, identifyModule } = useEonix()
  const moduleKey = getModuleKey(module)
  const config = moduleConfigs[moduleKey] || { role: module.role || '', config: module.config || {} }
  const [customRole, setCustomRole] = useState(
    config.role && !ROLE_OPTIONS.includes(config.role) ? config.role : ''
  )

  const selectedRole = config.role || ''
  const roleCompatible = useMemo(
    () => isRoleCompatible(selectedRole, module),
    [selectedRole, module]
  )
  const roleSelectValue = ROLE_OPTIONS.includes(selectedRole)
    ? selectedRole
    : (selectedRole ? CUSTOM_ROLE_VALUE : '')

  function updateRole(role) {
    const nextRole = role === CUSTOM_ROLE_VALUE ? customRole : role
    setModuleConfig(moduleKey, { ...config, role: nextRole })
  }

  function updateCustomRole(value) {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    setCustomRole(normalized)
    setModuleConfig(moduleKey, { ...config, role: normalized })
  }

  function updateConfig(name, value) {
    setModuleConfig(moduleKey, {
      ...config,
      config: { ...(config.config || {}), [name]: value },
    })
  }

  return (
    <div className="module-card fade-in">
      <div className="module-card-header">
        <div className="module-icon bg-elevated">CAN</div>
        <div className="module-card-info">
          <div className="module-name">{module.role || module.descriptor}</div>
          <div className="module-meta">
            <span>{module.descriptor}</span>
            <span className="module-can-id">{module.canId || `ID:${module.id}`}</span>
          </div>
        </div>
        <span className={`badge ${statusClass(module.status)}`}>{module.status}</span>
      </div>

      <div className="module-card-body">
        <div className="module-detail-grid">
          <span>UID</span><code>{module.uid}</code>
          <span>Firmware</span><code>{module.firmwareVersion}</code>
          <span>Hardware</span><code>{module.hardwareVersion}</code>
        </div>

        {module.replacementCandidate && (
          <div className="module-warning">
            {module.role || 'Assigned role'} is missing. Compatible replacement detected.
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Assigned Role</label>
          <select className="form-select" value={roleSelectValue} onChange={(event) => updateRole(event.target.value)}>
            <option value="" disabled>Select role...</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        {roleSelectValue === CUSTOM_ROLE_VALUE && (
          <div className="form-group">
            <label className="form-label">Custom Role Name</label>
            <input
              className="form-input"
              value={customRole}
              placeholder="CUSTOM_ROLE_NAME"
              onChange={(event) => updateCustomRole(event.target.value)}
            />
          </div>
        )}

        <div className="module-role-hint">
          {selectedRole && roleCompatible ? (
            <span className="text-success">Compatible role mapping</span>
          ) : selectedRole ? (
            <span className="text-danger">Role is not compatible with this descriptor</span>
          ) : (
            <span>Assign a role before generating SPI API code.</span>
          )}
        </div>

        <div className="module-config-box">
          <div className="module-config-title">Config</div>
          <div className="form-group">
            <label className="form-label">Sample Rate Hz</label>
            <input
              type="number"
              className="form-input"
              value={config.config?.sampleRateHz ?? module.config?.sampleRateHz ?? ''}
              onChange={(event) => updateConfig('sampleRateHz', Number(event.target.value))}
            />
          </div>
        </div>

        <button className="btn btn-secondary" onClick={() => identifyModule(module)}>
          Identify
        </button>
      </div>
    </div>
  )
}

function TestLetterNumberCard({ module }) {
  const { moduleConfigs, setModuleConfig, applyModuleConfig } = useEonix()
  const moduleKey = getModuleKey(module)
  const config = moduleConfigs[moduleKey] || {
    role: module.role || 'test_module_1',
    config: {
      letter: module.letter || 'A',
      number: Number(module.number ?? 123),
      led: Boolean(module.led ?? module.ledState),
    },
  }
  const letter = String(config.config?.letter ?? module.letter ?? 'A').slice(0, 1)
  const number = Number(config.config?.number ?? module.number ?? 123)
  const led = Boolean(config.config?.led ?? module.led ?? module.ledState)
  const numberValid = Number.isInteger(number) && number >= -32768 && number <= 32767
  const letterValid = letter.length === 1 && letter.charCodeAt(0) <= 127

  function updateConfig(nextConfig) {
    setModuleConfig(moduleKey, {
      role: config.role || 'test_module_1',
      config: {
        letter,
        number,
        led,
        ...(config.config || {}),
        ...nextConfig,
      },
    })
  }

  function updateRole(role) {
    setModuleConfig(moduleKey, {
      role: role || 'test_module_1',
      config: {
        letter,
        number,
        led,
        ...(config.config || {}),
      },
    })
  }

  function sanitizeAsciiLetter(value) {
    return Array.from(value).find((char) => char.charCodeAt(0) <= 127)?.slice(0, 1) || 'A'
  }

  return (
    <div className="module-card fade-in">
      <div className="module-card-header">
        <div className="module-icon bg-elevated">LN</div>
        <div className="module-card-info">
          <div className="module-name">{config.role || module.role || 'test_module_1'}</div>
          <div className="module-meta">
            <span>TEST_LETTER_NUMBER</span>
            <span className="module-can-id">Node {module.nodeId ?? module.node_id ?? '-'}</span>
          </div>
        </div>
        <span className={`badge ${module.online ? 'badge-green' : 'badge-red'}`}>
          {module.online ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      <div className="module-card-body">
        <div className="module-detail-grid">
          <span>Type</span><code>TEST_LETTER_NUMBER</code>
          <span>UID</span><code>{module.uid}</code>
          <span>Node ID</span><code>{module.nodeId ?? module.node_id ?? '-'}</code>
          <span>Runtime Cmd ID</span><code>{module.runtime_cmd_id ?? '-'}</code>
          <span>Runtime Data ID</span><code>{module.runtime_data_id ?? '-'}</code>
          <span>LED State</span><code>{led ? 'ON' : 'OFF'}</code>
        </div>

        <div className="form-group">
          <label className="form-label">Role Name</label>
          <input
            className="form-input"
            value={config.role || 'test_module_1'}
            placeholder="test_module_1"
            onChange={(event) => updateRole(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Letter</label>
          <input
            className="form-input"
            maxLength={1}
            value={letter}
            onChange={(event) => updateConfig({ letter: sanitizeAsciiLetter(event.target.value) })}
          />
          {!letterValid && (
            <div className="form-error">Letter must be one ASCII character.</div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Number</label>
          <input
            type="number"
            className="form-input"
            min="-32768"
            max="32767"
            value={Number.isNaN(number) ? '' : number}
            onChange={(event) => updateConfig({ number: Number(event.target.value) })}
          />
          {!numberValid && (
            <div className="form-error">Number must be a signed int16 (-32768 to 32767).</div>
          )}
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={led}
            onChange={(event) => updateConfig({ led: event.target.checked })}
          />
          <span>LED enabled</span>
        </label>

        <button className="btn btn-primary" disabled={!numberValid || !letterValid} onClick={() => applyModuleConfig(module)}>
          Apply Config
        </button>
      </div>
    </div>
  )
}
