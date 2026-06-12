import { useState } from 'react'
import ModuleCard from '../components/modules/ModuleCard'
import { useEonix } from '../context/EonixContext'
import { getModuleKey } from '../domain/moduleModel'

export default function Modules() {
  const { modules, connected, applyModuleConfig, confirmReplacement } = useEonix()
  const [isApplyingAll, setIsApplyingAll] = useState(false)

  async function handleApplyAll() {
    if (!connected) return
    setIsApplyingAll(true)
    try {
      for (const module of modules) {
        await applyModuleConfig(module)
      }
    } finally {
      setIsApplyingAll(false)
    }
  }

  return (
    <div className="fade-in">
      <header className="page-header">
        <h1 className="page-title">Hardware Modules</h1>
        <p className="page-subtitle">Assign application roles from SAM registry entries</p>
      </header>

      {!connected ? (
        <div className="empty-state">
          <span className="empty-state-icon">USB</span>
          <div className="empty-state-title">No Connection</div>
          <div className="empty-state-desc">
            Connect SAM over USB to discover CAN modules.
          </div>
        </div>
      ) : modules.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">CAN</span>
          <div className="empty-state-title">No Modules Detected</div>
          <div className="empty-state-desc">
            SAM is connected, but it has not reported any CAN module registry entries.
          </div>
        </div>
      ) : (
        <>
          <div className="page-action-row">
            <button className="btn btn-primary" disabled={!connected || isApplyingAll} onClick={handleApplyAll}>
              {isApplyingAll ? 'Saving...' : 'Save Role Mapping'}
            </button>
          </div>
          <ReplacementPanel modules={modules} confirmReplacement={confirmReplacement} />
          <div className="module-grid">
            {modules.map((module) => (
              <ModuleCard key={getModuleKey(module)} module={module} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ReplacementPanel({ modules, confirmReplacement }) {
  const missingModule = modules.find((module) => module.status === 'MISSING' && module.role)
  const candidateModule = modules.find((module) => (
    missingModule &&
    ['NEW', 'UNCONFIGURED'].includes(module.status) &&
    module.descriptor === missingModule.descriptor
  ))

  if (!missingModule || !candidateModule) return null

  return (
    <div className="module-replacement-panel">
      <div>
        <strong>{missingModule.role}</strong> is missing. A compatible {candidateModule.descriptor} module was found.
      </div>
      <button className="btn btn-secondary" onClick={() => confirmReplacement(missingModule, candidateModule)}>
        Replace with {candidateModule.uid}
      </button>
    </div>
  )
}
