import { useState, useRef, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { useEonix } from '../context/EonixContext'

export default function IDE() {
  const { generatedFiles, setGeneratedFiles, connected, deviceInfo } = useEonix()
  const [activeTab, setActiveTab] = useState(null)
  const [isFlashing, setIsFlashing] = useState(false)
  const [flashLogs, setFlashLogs] = useState([])
  const terminalRef = useRef(null)
  const flashListenerActive = useRef(false)

  // Set a valid initial tab whenever files change
  useEffect(() => {
    if (!generatedFiles) { setActiveTab(null); return }
    const keys = Object.keys(generatedFiles).sort()
    const preferredIno = Object.keys(generatedFiles).find(k => k.endsWith('.ino'))
    setActiveTab(prev => (
      prev && generatedFiles[prev] !== undefined
        ? prev
        : (preferredIno ?? keys[0] ?? null)
    ))
  }, [generatedFiles])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [flashLogs])

  const handleEditorChange = useCallback((value) => {
    if (!activeTab) return
    setGeneratedFiles(prev => ({ ...prev, [activeTab]: value ?? '' }))
  }, [activeTab, setGeneratedFiles])

  const handleSave = async () => {
    if (!window.eonix || !generatedFiles) return
    try {
      const result = await window.eonix.fs.showSaveDialog({
        title: 'Save Project Folder',
        buttonLabel: 'Save',
        filters: [{ name: 'Source Code', extensions: ['c', 'h', 'ino', 'cpp'] }]
      })
      if (result.canceled || !result.filePath) return
      // Save current active file
      await window.eonix.fs.saveFile({ filePath: result.filePath, content: generatedFiles[activeTab] })
      setFlashLogs(prev => [...prev, { type: 'success', text: `✅ Saved to ${result.filePath}` }])
    } catch (e) {
      setFlashLogs(prev => [...prev, { type: 'error', text: `❌ Save failed: ${e.message}` }])
    }
  }

  const handleFlash = async () => {
    if (!window.eonix) return
    if (!deviceInfo?.port || deviceInfo?.port === 'MOCK') {
      setFlashLogs(prev => [...prev, { type: 'error', text: '❌ No real device port. Connect hardware first.' }])
      return
    }

    // Prevent duplicate listeners
    if (!flashListenerActive.current) {
      window.eonix.flash.onLog((log) => {
        setFlashLogs(prev => [...prev, log])
      })
      flashListenerActive.current = true
    }

    setIsFlashing(true)
    setFlashLogs([{ type: 'info', text: `⚡ Initiating flash to port ${deviceInfo.port}...` }])

    try {
      await window.eonix.flash.upload({
        port: deviceInfo.port,
        binPath: 'firmware.bin'
      })
      setFlashLogs(prev => [...prev, { type: 'success', text: '✅ Firmware successfully flashed!' }])
    } catch (e) {
      setFlashLogs(prev => [...prev, { type: 'error', text: `❌ Flash failed: ${e.message}` }])
    } finally {
      setIsFlashing(false)
      window.eonix.flash.removeLogListener()
      flashListenerActive.current = false
    }
  }

  if (!generatedFiles) {
    return (
      <div className="fade-in empty-state" style={{ height: '100%' }}>
        <span className="empty-state-icon">⌨️</span>
        <div className="empty-state-title">No Project Generated</div>
        <div className="empty-state-desc">
          Go to the Code Gen tab to generate a project first.
        </div>
      </div>
    )
  }

  const tabs = Object.keys(generatedFiles).sort()
  const currentContent = activeTab ? (generatedFiles?.[activeTab] ?? '') : ''
  // Monaco can get stuck loading certain C++ language services in this Electron setup.
  // Using 'c' for `.ino` keeps the editor reliably interactive; syntax highlighting is reduced but editing works.
  const language = activeTab?.endsWith('.ino')
    ? 'c'
    : (activeTab?.endsWith('.h') || activeTab?.endsWith('.c') ? 'c' : 'plaintext')

  const hasStmMain = !!generatedFiles?.['main.c']
  const editorLoading = (
    <textarea
      value={String(currentContent ?? '')}
      onChange={(e) => handleEditorChange(e.target.value)}
      spellCheck={false}
      style={{
        width: '100%',
        height: '100%',
        resize: 'none',
        border: 'none',
        outline: 'none',
        background: 'rgba(0,0,0,0.12)',
        color: 'var(--text-primary)',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13,
        padding: '16px',
        lineHeight: 1.6,
        boxSizing: 'border-box',
      }}
    />
  )

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 16px 0' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleSave}>
            💾 Save File
          </button>
        </div>
        {hasStmMain && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-success"
              onClick={handleFlash}
              disabled={isFlashing || !connected || deviceInfo?.port === 'MOCK'}
              title={deviceInfo?.port === 'MOCK' ? 'Flashing requires real hardware' : ''}
            >
              {isFlashing ? '⚡ Flashing...' : '⚡ Upload to STM32'}
            </button>
          </div>
        )}
      </div>

      {/* IDE Layout */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0 }}>
        {/* Editor Area */}
        <div className="card" style={{ flex: 2, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="tab-bar">
            {tabs.map(f => (
              <div
                key={f}
                className={`tab ${activeTab === f ? 'active' : ''}`}
                onClick={() => setActiveTab(f)}
              >
                {f}
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            {activeTab && (
              <Editor
                key={activeTab ?? 'editor'}
                height="100%"
                theme="vs-dark"
                path={activeTab}
                language={language}
                value={String(currentContent ?? '')}
                onChange={(v) => handleEditorChange(v)}
                loading={editorLoading}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  readOnly: false,
                }}
              />
            )}
          </div>
        </div>

        {/* Terminal Area */}
        <div className="card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>TERMINAL</span>
            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setFlashLogs([])}>Clear</button>
          </div>
          <div ref={terminalRef} className="terminal" style={{ flex: 1, border: 'none', borderRadius: 0, margin: 0 }}>
            {flashLogs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.5 }}>
                {hasStmMain ? 'STM32_Programmer_CLI logs will appear here...' : 'Arduino-only project: no STM32 flash logs.'}
              </div>
            ) : (
              flashLogs.map((log, i) => (
                <div key={i} className={`terminal-line ${log.type}`}>{String(log.text).trim()}</div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ height: '16px', flexShrink: 0 }} />
    </div>
  )
}
