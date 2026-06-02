import { useEonix } from '../context/EonixContext'
import ModuleCard from '../components/ModuleCard'
import { useState } from 'react'

export default function Modules() {
  const { modules, connected, applyModuleConfig } = useEonix()
  const [isApplyingAll, setIsApplyingAll] = useState(false)

  const handleApplyAll = async () => {
    if (!connected) return
    setIsApplyingAll(true)
    try {
      let applied = 0
      for (const m of modules) {
        // applyModuleConfig returns boolean success in all cases
        const ok = await applyModuleConfig(m)
        if (ok) applied++
      }
      // UI log is handled inside applyModuleConfig
      if (applied === 0) {
        // nothing to apply
      }
    } finally {
      setIsApplyingAll(false)
    }
  }

  return (
    <div className="fade-in">
      <header className="page-header">
        <h1 className="page-title">Hardware Modules</h1>
        <p className="page-subtitle">Configure modules connected to the CAN bus</p>
      </header>

      {!connected ? (
        <div className="empty-state">
          <span className="empty-state-icon">🔌</span>
          <div className="empty-state-title">No Connection</div>
          <div className="empty-state-desc">
            Connect the Eonix Motherboard to discover modules.
          </div>
        </div>
      ) : modules.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🔍</span>
          <div className="empty-state-title">Scanning CAN Bus...</div>
          <div className="empty-state-desc">
            Waiting for modules to announce themselves. Ensure they are powered and connected to the CAN lines.
          </div>
        </div>
      ) : (
        <>
          <div style={{ padding: '0 28px 8px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              disabled={!connected || isApplyingAll}
              onClick={handleApplyAll}
              title="Apply all selected module configurations"
            >
              {isApplyingAll ? 'Applying...' : 'Apply All to Hardware'}
            </button>
          </div>
          <div className="module-grid">
            {modules.map(mod => (
              <ModuleCard key={mod.id} module={mod} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
