import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEonix } from '../context/EonixContext'
import { generateProject } from '../../codegen/generator'

const PLATFORMS = ['Mega', 'Uno', 'Nano', 'ESP32', 'STM32']

export default function CodeGen() {
  const navigate = useNavigate()
  const { modules, moduleConfigs, setGeneratedFiles, generatedFiles, connected, toggleMock } = useEonix()
  const [selectedFile, setSelectedFile] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('Mega')

  const handleGenerate = () => {
    const files = generateProject(modules, moduleConfigs, selectedPlatform)
    setGeneratedFiles(files)
    
    // Prefer the generated Arduino sketch when present.
    const keys = Object.keys(files).sort()
    const sketchName = `arduino_${selectedPlatform.toLowerCase()}_spi_telemetry_fetcher.ino`
    setSelectedFile(
      keys.includes(sketchName)
        ? sketchName
        : (keys[0] ?? sketchName)
    )
  }

  // Removed useEffect that cleared generated files so user modifications persist.

  const handleOpenIDE = () => {
    navigate('/ide')
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="page-header" style={{ flexShrink: 0 }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Code Generation</h1>
            <p className="page-subtitle">Generate Arduino SPI Telemetry .ino</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target Platform:</span>
              <select
                className="btn btn-secondary"
                style={{ padding: '4px 8px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
              >
                {PLATFORMS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handleGenerate}
              disabled={!modules.length}
            >
              🚀 Generate Code
            </button>
            {generatedFiles && (
              <button className="btn btn-secondary" onClick={handleOpenIDE}>
                💻 Open in IDE
              </button>
            )}
          </div>
        </div>
      </header>

      <div style={{ padding: '0 28px 28px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {!modules.length ? (
          <div className="empty-state" style={{ flex: 1 }}>
            <span className="empty-state-icon">📋</span>
            <div className="empty-state-title">No Modules Configured</div>
            <div className="empty-state-desc">
              Discover and configure modules on the CAN bus first before generating code.
            </div>
            {!connected && (
              <button className="btn btn-secondary" onClick={toggleMock}>
                Try Mock Mode
              </button>
            )}
          </div>
        ) : !generatedFiles ? (
           <div className="empty-state" style={{ flex: 1 }}>
             <span className="empty-state-icon">⚙️</span>
             <div className="empty-state-title">Ready to Generate</div>
             <div className="empty-state-desc">
              {modules.length} module(s) ready for <strong>Arduino {selectedPlatform}</strong>. Click "Generate Code".
             </div>
           </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0 }}>
            {/* File List sidebar */}
            <div className="card" style={{ width: '220px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', padding: '0 8px' }}>GENERATED FILES</div>
              {Object.keys(generatedFiles).sort().map(f => (
                <button 
                  key={f}
                  className={`btn ${selectedFile === f ? 'btn-secondary' : ''}`}
                  style={{ width: '100%', justifyContent: 'flex-start', background: selectedFile === f ? 'var(--bg-elevated)' : 'transparent', border: 'none' }}
                  onClick={() => setSelectedFile(f)}
                >
                  <span style={{ opacity: 0.5 }}>
                    {f.endsWith('.h') ? 'h' : (f.endsWith('.c') ? 'c' : (f.endsWith('.ino') ? 'ino' : 'txt'))}
                  </span>
                  {f}
                </button>
              ))}
            </div>

            {/* Code Preview */}
            <div className="card code-preview" style={{ flex: 1, margin: 0 }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                <code>{generatedFiles?.[selectedFile] ?? ''}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
