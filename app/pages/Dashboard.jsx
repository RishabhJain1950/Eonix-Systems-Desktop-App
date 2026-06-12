import { useEonix } from '../context/EonixContext'

export default function Dashboard() {
  const { connected, deviceInfo, modules, logs } = useEonix()

  return (
    <div className="fade-in">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">SAM connection status and engineering overview</p>
      </header>

      <div className="page-pad">
        {!connected ? (
          <div className="empty-state">
            <span className="empty-state-icon">USB</span>
            <div className="empty-state-title">No Device Detected</div>
            <div className="empty-state-desc">
              Connect SAM over USB to begin configuring modules.
            </div>
          </div>
        ) : (
          <div className="dashboard-grid">
            <div className="card">
              <h3>SAM</h3>
              <div className="detail-stack">
                <DetailRow label="Status" value={<span className="badge badge-green">Connected</span>} />
                <DetailRow label="Port" value={deviceInfo?.port || 'Unknown'} />
                <DetailRow label="Device" value={deviceInfo?.device || 'EONIX_SAM'} mono />
                <DetailRow label="Transport" value={deviceInfo?.transport || 'usb_cdc'} mono />
                <DetailRow label="Firmware" value={deviceInfo?.firmware || 'unknown'} mono />
              </div>
            </div>

            <div className="card">
              <h3>Module Registry</h3>
              <div className="metric-row">
                <div className="metric-circle">{modules.length}</div>
                <div>
                  <div className="metric-title">Modules Detected</div>
                  <div className="metric-subtitle">Received from the SAM module registry</div>
                </div>
              </div>
            </div>

            <div className="card dashboard-log-card">
              <h3>Device Log</h3>
              <div className="terminal dashboard-terminal">
                {logs.length === 0 ? (
                  <div className="terminal-muted">No messages yet...</div>
                ) : (
                  logs.slice(-60).map((log, index) => (
                    <div key={`${log.time}-${index}`} className={`terminal-line ${log.type || 'info'}`}>
                      {log.text}
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

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <span className={mono ? 'mono' : ''}>{value}</span>
    </div>
  )
}
