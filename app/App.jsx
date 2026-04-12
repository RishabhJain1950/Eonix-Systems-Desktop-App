import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { EonixProvider, useEonix } from './context/EonixContext'

import Dashboard from './pages/Dashboard'
import Modules from './pages/Modules'
import CodeGen from './pages/CodeGen'
import Telemetry from './pages/Telemetry'
import IDE from './pages/IDE'

function Titlebar() {
  const { connected } = useEonix()
  return (
    <div className="titlebar">
      <div className="titlebar-logo">
        <img src="/assets/New Logo only symbol color contrast.png" alt="Eonix Logo" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
        <span>Eonix</span>
      </div>
      <div className="titlebar-center">
        <div className={`titlebar-status-dot ${connected ? 'connected' : ''}`} />
        <span>{connected ? 'Motherboard connected' : 'Waiting for device...'}</span>
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={() => window.eonix?.window.minimize()}>—</button>
        <button className="titlebar-btn" onClick={() => window.eonix?.window.maximize()}>□</button>
        <button className="titlebar-btn close" onClick={() => window.eonix?.window.close()}>✕</button>
      </div>
    </div>
  )
}

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { connected, toggleMock, mockMode, modules } = useEonix()

  const tabs = [
    { id: '/', label: 'Dashboard', icon: '🏠' },
    { id: '/modules', label: 'Modules', icon: '⚡', badge: modules.length > 0 ? modules.length : null },
    { id: '/telemetry', label: 'Telemetry', icon: '📡' },
    { id: '/codegen', label: 'Code Gen', icon: '⚙️' },
    { id: '/ide', label: 'IDE & Flash', icon: '💻' },
  ]

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">WORKSPACE</div>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`sidebar-item ${location.pathname === t.id ? 'active' : ''}`}
            onClick={() => navigate(t.id)}
          >
            <span className="sidebar-icon">{t.icon}</span>
            {t.label}
            {t.badge && <span className="sidebar-badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      <div className="sidebar-divider" />

      <div className={`device-status-card ${connected ? 'connected' : ''}`}>
        <div className="device-status-header">
          <div className={`pulse-dot ${connected ? 'active' : ''}`} />
          <div className="device-status-name">Eonix Motherboard</div>
        </div>
        <div className="device-status-info">
          {connected ? 'Connected via USB-CDC' : 'Disconnected'}
        </div>
      </div>

      <div className="sidebar-bottom">
        <button className="btn btn-secondary" style={{width: '100%', fontSize: '11px'}} onClick={toggleMock}>
          {mockMode ? 'Disable Mock Mode' : 'Enable Mock Mode'}
        </button>
      </div>
    </div>
  )
}

function AppLayout() {
  return (
    <div className="app-shell">
      <Titlebar />
      <div className="app-body">
        <Sidebar />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/telemetry" element={<Telemetry />} />
            <Route path="/codegen" element={<CodeGen />} />
            <Route path="/ide" element={<IDE />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <EonixProvider>
      <HashRouter>
        <AppLayout />
      </HashRouter>
    </EonixProvider>
  )
}

export default App
