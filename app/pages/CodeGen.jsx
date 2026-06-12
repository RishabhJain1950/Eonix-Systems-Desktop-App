import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateProject } from '../../codegen/generator'
import { useEonix } from '../context/EonixContext'

const TARGETS = ['Arduino Uno', 'Arduino Mega']

export default function CodeGen() {
  const navigate = useNavigate()
  const { modules, moduleConfigs, setGeneratedFiles, generatedFiles } = useEonix()
  const [selectedFile, setSelectedFile] = useState('')
  const [selectedTarget, setSelectedTarget] = useState(TARGETS[0])
  const [copyStatus, setCopyStatus] = useState('')

  function handleGenerate() {
    const files = generateProject(modules, moduleConfigs, selectedTarget, generatedFiles)
    setGeneratedFiles(files)

    const filenames = Object.keys(files).sort()
    setSelectedFile(filenames.find((filename) => filename.endsWith('.ino')) || filenames[0] || '')
    setCopyStatus('')
  }

  async function handleCopyCode() {
    const content = generatedFiles?.[selectedFile]
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopyStatus('Copied')
  }

  return (
    <div className="fade-in codegen-page">
      <header className="page-header page-header-row">
        <div>
          <h1 className="page-title">Code Generation</h1>
          <p className="page-subtitle">Generate role-based SPI API files for the user MCU</p>
        </div>
        <div className="toolbar-row">
          <div className="target-select">
            <span>Target:</span>
            <select
              className="btn btn-secondary"
              value={selectedTarget}
              onChange={(event) => setSelectedTarget(event.target.value)}
            >
              {TARGETS.map((target) => (
                <option key={target} value={target}>{target}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={!modules.length}>
            Generate Code
          </button>
          {generatedFiles && (
            <>
              <button className="btn btn-secondary" onClick={handleCopyCode}>
                Copy Code
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/ide')}>
                Open in IDE
              </button>
            </>
          )}
        </div>
      </header>

      <div className="page-fill">
        {!modules.length ? (
          <div className="empty-state fill-height">
            <span className="empty-state-icon">GEN</span>
            <div className="empty-state-title">No Modules Configured</div>
            <div className="empty-state-desc">
              Discover and configure modules from SAM before generating code.
            </div>
          </div>
        ) : !generatedFiles ? (
          <div className="empty-state fill-height">
            <span className="empty-state-icon">API</span>
            <div className="empty-state-title">Ready to Generate</div>
            <div className="empty-state-desc">
              {modules.length} module(s) ready for <strong>{selectedTarget}</strong>. Click Generate Code.
            </div>
          </div>
        ) : (
          <div className="codegen-layout">
            <div className="card generated-file-list">
              <div className="panel-label">GENERATED FILES</div>
              {Object.keys(generatedFiles).sort().map((filename) => (
                <button
                  key={filename}
                  className={`generated-file-button ${selectedFile === filename ? 'active' : ''}`}
                  onClick={() => setSelectedFile(filename)}
                >
                  <span>{filename.split('.').pop()}</span>
                  {filename}
                </button>
              ))}
            </div>

            <div className="card code-preview">
              {copyStatus && <div className="copy-status">{copyStatus}</div>}
              <textarea className="code-preview-textarea" readOnly value={generatedFiles?.[selectedFile] ?? ''} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
