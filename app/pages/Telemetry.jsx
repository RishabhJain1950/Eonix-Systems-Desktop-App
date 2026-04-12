import { useEffect, useMemo } from 'react'
import { useEonix } from '../context/EonixContext'

function formatMaybeNumber(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number' && Number.isNaN(v)) return '—'
  return v
}

export default function Telemetry() {
  const { connected, modules, telemetry, startTelemetry, stopTelemetry } = useEonix()

  useEffect(() => {
    if (!connected) return
    startTelemetry({ interval_ms: 100 })
    return () => stopTelemetry()
  }, [connected, startTelemetry, stopTelemetry])

  const modulesById = telemetry?.modulesById || {}

  const rows = useMemo(() => {
    return modules.map((m) => {
      const entry = modulesById[String(m.id)] || modulesById[m.id] || {}
      return { module: m, entry }
    })
  }, [modules, modulesById])

  return (
    <div className="fade-in">
      <header className="page-header">
        <h1 className="page-title">Telemetry</h1>
        <p className="page-subtitle">Live readings from modules (updates only while this tab is active)</p>
      </header>

      {!connected ? (
        <div className="empty-state">
          <span className="empty-state-icon">📡</span>
          <div className="empty-state-title">No Connection</div>
          <div className="empty-state-desc">Connect your motherboard over USB-CDC first.</div>
        </div>
      ) : modules.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🔍</span>
          <div className="empty-state-title">No Modules</div>
          <div className="empty-state-desc">Discover modules in the Modules tab first.</div>
        </div>
      ) : (
        <div style={{ padding: '0 28px' }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>Module</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>Values</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ module, entry }) => (
                    <tr key={module.id}>
                      <td style={{ padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 600 }}>{module.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{module.type} • CAN {module.canId || `ID:${module.id}`}</div>
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>
                        {module.type === 'lidar' && (
                          <div style={{ lineHeight: 1.6 }}>
                            Distance: {formatMaybeNumber(entry.distance_mm)} mm
                          </div>
                        )}
                        {module.type === 'imu' && (
                          <div style={{ lineHeight: 1.6 }}>
                            Gyro X: {formatMaybeNumber(entry.gyro_x_centi_dps)} cdeg/s<br />
                            Gyro Y: {formatMaybeNumber(entry.gyro_y_centi_dps)} cdeg/s
                          </div>
                        )}
                        {module.type === 'temperature' && (
                          <div style={{ lineHeight: 1.6 }}>
                            Temp: {formatMaybeNumber(entry.temperature_c)} C
                          </div>
                        )}
                        {module.type === 'gpio' && (
                          <div style={{ lineHeight: 1.6 }}>
                            GPIO mask: {formatMaybeNumber(entry.gpio_pin_mask)}<br />
                            PWM duty: {formatMaybeNumber(entry.gpio_pwm_duty)}
                          </div>
                        )}
                        {!['lidar', 'imu', 'temperature', 'gpio'].includes(module.type) && (
                          <div style={{ opacity: 0.75 }}>—</div>
                        )}
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px solid var(--border)', fontSize: 12, opacity: 0.85 }}>
                        {entry.last_update_ms !== undefined ? `${entry.last_update_ms}` : '—'}
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

