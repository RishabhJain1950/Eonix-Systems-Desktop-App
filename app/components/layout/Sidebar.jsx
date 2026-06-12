import { useLocation, useNavigate } from 'react-router-dom'
import { NAVIGATION_ITEMS } from '../../config/navigation'
import { useEonix } from '../../context/EonixContext'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { connected, modules } = useEonix()

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">WORKSPACE</div>
        {NAVIGATION_ITEMS.map((item) => {
          const badge = item.usesModuleBadge && modules.length > 0 ? modules.length : null
          return (
            <button
              key={item.id}
              className={`sidebar-item ${location.pathname === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <SidebarIcon name={item.icon} />
              {item.label}
              {badge && <span className="sidebar-badge">{badge}</span>}
            </button>
          )
        })}
      </div>

      <div className="sidebar-divider" />

      <div className={`device-status-card ${connected ? 'connected' : ''}`}>
        <div className="device-status-header">
          <div className={`pulse-dot ${connected ? 'active' : ''}`} />
          <div className="device-status-name">SAM</div>
        </div>
        <div className="device-status-info">
          {connected ? 'Connected via USB-CDC' : 'Disconnected'}
        </div>
      </div>
    </div>
  )
}

function SidebarIcon({ name }) {
  return (
    <span className="sidebar-icon" aria-hidden="true">
      {name === 'dashboard' && (
        <svg viewBox="0 0 24 24">
          <path d="M4 13h7V4H4v9Zm9 7h7V4h-7v16ZM4 20h7v-5H4v5Z" />
        </svg>
      )}
      {name === 'modules' && (
        <svg viewBox="0 0 24 24">
          <path d="M7 7h10v4H7V7Zm-3 7h7v4H4v-4Zm9 0h7v4h-7v-4ZM6 12h2v2H6v-2Zm10 0h2v2h-2v-2Zm-5-3h2v2h-2V9Z" />
        </svg>
      )}
      {name === 'telemetry' && (
        <svg viewBox="0 0 24 24">
          <path d="M3 13h3l2-5 4 10 3-7 2 2h4v2h-5l-2.2-2.2L12 21 8 11l-.7 2H3v-2Z" />
        </svg>
      )}
      {name === 'codegen' && (
        <svg viewBox="0 0 24 24">
          <path d="m8.6 16.6-1.4 1.4L2.2 13l5-5 1.4 1.4L5 13l3.6 3.6Zm6.8 0L19 13l-3.6-3.6L16.8 8l5 5-5 5-1.4-1.4ZM13.2 5l2 .5L10.8 19l-2-.5L13.2 5Z" />
        </svg>
      )}
      {name === 'ide' && (
        <svg viewBox="0 0 24 24">
          <path d="M4 5h16v11H4V5Zm2 2v7h12V7H6Zm4 11h4v1h4v2H6v-2h4v-1Z" />
        </svg>
      )}
    </span>
  )
}
