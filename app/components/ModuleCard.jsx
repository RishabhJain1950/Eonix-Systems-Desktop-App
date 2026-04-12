import { useMemo } from 'react'
import { useEonix } from '../context/EonixContext'

const moduleIcons = {
  lidar: '👁️',
  imu: '🧭',
  temperature: '🌡️',
  gpio: '⚡',
  default: '📦'
}

export default function ModuleCard({ module }) {
  const { moduleConfigs, setModuleConfig } = useEonix()
  const config = moduleConfigs[module.id] || { function: '', params: {} }

  const isConfigured = useMemo(() => {
    if (!config.function) return false
    const def = module.functions.find(f => f.name === config.function)
    if (!def) return false
    // Basic: ensure all params are present (if required).
    return def.parameters.every(p => config.params[p.name] !== undefined && config.params[p.name] !== '')
  }, [config.function, config.params, module.functions])

  const handleFunctionChange = (e) => {
    const fnName = e.target.value
    const fnDef = module.functions.find(f => f.name === fnName)

    const params = {}
    if (fnDef) {
      fnDef.parameters.forEach(p => {
        params[p.name] = p.default
      })
    }
    setModuleConfig(module.id, { function: fnName, params })
  }

  const handleParamChange = (pName, type, val) => {
    let parsed = val
    if (type === 'int') parsed = parseInt(val, 10)
    if (type === 'float') parsed = parseFloat(val)

    setModuleConfig(module.id, {
      ...config,
      params: { ...config.params, [pName]: parsed }
    })
  }

  const selectedFuncDef = module.functions.find(f => f.name === config.function)
  const icon = moduleIcons[module.type] || moduleIcons.default

  return (
    <div className="module-card fade-in">
      <div className="module-card-header">
        <div className="module-icon bg-elevated">{icon}</div>
        <div className="module-card-info">
          <div className="module-name">{module.name}</div>
          <div className="module-meta">
            <span style={{textTransform: 'uppercase'}}>{module.type}</span> •
            <span className="module-can-id">{module.canId || `ID:${module.id}`}</span>
          </div>
        </div>
      </div>

      <div className="module-card-body">
        <div className="form-group">
          <label className="form-label">Module Function</label>
          <select 
            className="form-select" 
            value={config.function} 
            onChange={handleFunctionChange}
          >
            <option value="" disabled>Select a function...</option>
            {module.functions.map(f => (
              <option key={f.name} value={f.name}>{f.name.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: '10px', fontSize: 12, opacity: 0.85 }}>
          {isConfigured ? (
            <span style={{ fontWeight: 700, color: 'var(--green)' }}>Configured (will apply with “Apply All”)</span>
          ) : (
            <span style={{ opacity: 0.7 }}>Select a function + fill parameters, then use “Apply All to Hardware”.</span>
          )}
        </div>

        {selectedFuncDef && selectedFuncDef.parameters.length > 0 && (
          <div style={{ marginTop: '8px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
              Parameters
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedFuncDef.parameters.map(p => (
                <div key={p.name} className="form-group">
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    {p.name.replace(/_/g, ' ')} <span style={{opacity: 0.5}}>({p.type})</span>
                  </label>
                  <input
                    type={p.type === 'int' || p.type === 'float' ? 'number' : 'text'}
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    value={config.params[p.name] !== undefined ? config.params[p.name] : ''}
                    onChange={(e) => handleParamChange(p.name, p.type, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
