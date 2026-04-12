import { useEonix } from '../context/EonixContext'

export default function Dashboard() {
  const { connected, deviceInfo, modules, logs } = useEonix()

  return (
    <div className="fade-in">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Hardware connection status and overview</p>
      </header>

      <div style={{ padding: '0 28px' }}>
        {!connected ? (
          <div className="empty-state">
            <span className="empty-state-icon">🔌</span>
            <div className="empty-state-title">No Device Detected</div>
            <div className="empty-state-desc">
              Please connect your Eonix Motherboard via USB to begin configuring modules.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: '1fr 1fr' }}>
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>Motherboard</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status</span>
                  <span className="badge badge-green">Connected</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Port</span>
                  <span>{deviceInfo?.port || 'Unknown'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Firmware</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{deviceInfo?.firmware || 'v1.0.0'}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>CAN Bus Explorer</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '50%', 
                  background: 'var(--bg-elevated)', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', color: 'var(--accent)'
                }}>
                  {modules.length}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>Modules Detected</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                    Auto-discovered on CAN network
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ marginBottom: '12px' }}>Device Log</h3>
              <div className="terminal" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {logs.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', opacity: 0.7 }}>No messages yet…</div>
                ) : (
                  logs.slice(-60).map((l, i) => (
                    <div key={i} className={`terminal-line ${l.type || 'info'}`}>
                      {l.text}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
