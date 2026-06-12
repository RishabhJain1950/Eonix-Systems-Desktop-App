import { useEffect, useMemo } from 'react'
import { useEonix } from '../context/EonixContext'
import { getModuleKey, getTelemetryValues } from '../domain/moduleModel'

function formatValue(value) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number' && Number.isNaN(value)) return '-'
  return value
}

export default function Telemetry() {
  const { connected, modules, telemetry, startTelemetry, stopTelemetry } = useEonix()

  useEffect(() => {
    if (!connected) return
    startTelemetry({ interval_ms: 500 })
    return () => stopTelemetry()
  }, [connected, startTelemetry, stopTelemetry])

  const rows = useMemo(() => {
    const modulesById = telemetry?.modulesById || {}
    return modules.map((module) => {
      const moduleKey = getModuleKey(module)
      const entry = modulesById[module.role] || modulesById[moduleKey] || modulesById[String(module.id)] || {}
      return {
        module,
        entry,
        values: getTelemetryValues(entry),
      }
    })
  }, [modules, telemetry])
  const testRows = rows.filter(({ module }) => module.descriptor === 'TEST_LETTER_NUMBER')

  return (
    <div className="fade-in">
      <header className="page-header">
        <h1 className="page-title">Telemetry</h1>
        <p className="page-subtitle">Live readings from SAM while this tab is active</p>
      </header>

      {!connected ? (
        <div className="empty-state">
          <span className="empty-state-icon">TEL</span>
          <div className="empty-state-title">No Connection</div>
          <div className="empty-state-desc">Connect SAM over USB-CDC first.</div>
        </div>
      ) : modules.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">CAN</span>
          <div className="empty-state-title">No Modules</div>
          <div className="empty-state-desc">Discover modules in the Modules tab first.</div>
        </div>
      ) : testRows.length > 0 ? (
        <div className="page-pad telemetry-card-grid">
          {testRows.map(({ module, entry }) => (
            <div className="card telemetry-live-card" key={getModuleKey(module)}>
              <div className="telemetry-live-header">
                <div>
                  <div className="table-primary">{module.role || 'test_module_1'}</div>
                  <div className="table-secondary">TEST_LETTER_NUMBER</div>
                </div>
                <span className={`badge ${module.online ? 'badge-green' : 'badge-red'}`}>
                  {module.online ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="telemetry-live-values">
                <div>
                  <span>Letter</span>
                  <strong>{formatValue(entry.letter ?? module.letter)}</strong>
                </div>
                <div>
                  <span>Number</span>
                  <strong>{formatValue(entry.number ?? module.number)}</strong>
                </div>
                <div>
                  <span>LED</span>
                  <strong>{(entry.led ?? entry.ledState ?? module.led) ? 'ON' : 'OFF'}</strong>
                </div>
                <div>
                  <span>Online</span>
                  <strong>{(entry.online ?? module.online) ? 'YES' : 'NO'}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="page-pad">
          <div className="card telemetry-card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Values</th>
                    <th>Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ module, entry, values }) => (
                    <tr key={getModuleKey(module)}>
                      <td>
                        <div className="table-primary">{module.role || module.name || module.descriptor}</div>
                        <div className="table-secondary">
                          {module.descriptor} - CAN {module.canId || `ID:${module.id}`}
                        </div>
                      </td>
                      <td>
                        {values.length > 0 ? (
                          <div className="telemetry-values">
                            {values.map((item) => (
                              <div key={item.key}>
                                {item.label}: {formatValue(item.value)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="table-secondary">-</div>
                        )}
                      </td>
                      <td className="table-secondary">
                        {entry.last_update_ms ? new Date(entry.last_update_ms).toLocaleTimeString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
