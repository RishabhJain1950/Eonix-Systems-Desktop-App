import Editor from '@monaco-editor/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useEonix } from '../context/EonixContext'

export default function IDE() {
  const { generatedFiles, setGeneratedFiles, connected, deviceInfo } = useEonix()
  const [activeTab, setActiveTab] = useState(null)
  const [isFlashing, setIsFlashing] = useState(false)
  const [flashLogs, setFlashLogs] = useState([])
  const terminalRef = useRef(null)
  const flashListenerActive = useRef(false)

  useEffect(() => {
    if (!generatedFiles) {
      setActiveTab(null)
      return
    }

    const filenames = Object.keys(generatedFiles).sort()
    setActiveTab((previousTab) => (
      previousTab && generatedFiles[previousTab] !== undefined
        ? previousTab
        : (filenames[0] ?? null)
    ))
  }, [generatedFiles])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [flashLogs])

  const handleEditorChange = useCallback((value) => {
    if (!activeTab) return
    setGeneratedFiles((previousFiles) => ({ ...previousFiles, [activeTab]: value ?? '' }))
  }, [activeTab, setGeneratedFiles])

  async function handleSave() {
    if (!window.eonix || !generatedFiles || !activeTab) return

    try {
      const result = await window.eonix.fs.showSaveDialog({
        title: 'Save Current File',
        buttonLabel: 'Save',
        filters: [{ name: 'Source Code', extensions: ['c', 'h', 'ino', 'cpp', 'txt'] }],
      })

      if (result.canceled || !result.filePath) return

      await window.eonix.fs.saveFile({
        filePath: result.filePath,
        content: generatedFiles[activeTab],
      })
      setFlashLogs((previousLogs) => [
        ...previousLogs,
        { type: 'success', text: `Saved to ${result.filePath}` },
      ])
    } catch (error) {
      setFlashLogs((previousLogs) => [
        ...previousLogs,
        { type: 'error', text: `Save failed: ${error.message}` },
      ])
    }
  }

  async function handleFlash() {
    if (!window.eonix) return
    if (!deviceInfo?.port) {
      setFlashLogs((previousLogs) => [
        ...previousLogs,
        { type: 'error', text: 'No SAM device port. Connect hardware first.' },
      ])
      return
    }

    if (!flashListenerActive.current) {
      window.eonix.flash.onLog((log) => {
        setFlashLogs((previousLogs) => [...previousLogs, log])
      })
      flashListenerActive.current = true
    }

    setIsFlashing(true)
    setFlashLogs([{ type: 'info', text: `Initiating flash to port ${deviceInfo.port}...` }])

    try {
      await window.eonix.flash.upload({
        port: deviceInfo.port,
        binPath: 'firmware.bin',
      })
      setFlashLogs((previousLogs) => [
        ...previousLogs,
        { type: 'success', text: 'Firmware successfully flashed.' },
      ])
    } catch (error) {
      setFlashLogs((previousLogs) => [
        ...previousLogs,
        { type: 'error', text: `Flash failed: ${error.message}` },
      ])
    } finally {
      setIsFlashing(false)
      window.eonix.flash.removeLogListener()
      flashListenerActive.current = false
    }
  }

  if (!generatedFiles) {
    return (
      <div className="fade-in empty-state fill-height">
        <span className="empty-state-icon">IDE</span>
        <div className="empty-state-title">No Project Generated</div>
        <div className="empty-state-desc">
          Go to the Code Gen tab to generate a project first.
        </div>
      </div>
    )
  }

  const tabs = Object.keys(generatedFiles).sort()
  const currentContent = activeTab ? (generatedFiles?.[activeTab] ?? '') : ''
  const language = activeTab?.endsWith('.h') || activeTab?.endsWith('.c') || activeTab?.endsWith('.ino')
    ? 'c'
    : 'plaintext'

  return (
    <div className="fade-in ide-page">
      <div className="ide-toolbar">
        <button className="btn btn-secondary" onClick={handleSave}>
          Save File
        </button>
        <button
          className="btn btn-success"
          onClick={handleFlash}
          disabled={isFlashing || !connected}
        >
          {isFlashing ? 'Flashing...' : 'Upload to STM32'}
        </button>
      </div>

      <div className="ide-layout">
        <div className="card ide-editor-card">
          <div className="tab-bar">
            {tabs.map((filename) => (
              <button
                key={filename}
                className={`tab ${activeTab === filename ? 'active' : ''}`}
                onClick={() => setActiveTab(filename)}
              >
                {filename}
              </button>
            ))}
          </div>
          <div className="ide-editor-frame">
            {activeTab && (
              <Editor
                key={activeTab}
                height="100%"
                theme="vs-dark"
                path={activeTab}
                language={language}
                value={String(currentContent ?? '')}
                onChange={handleEditorChange}
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

        <div className="card ide-terminal-card">
          <div className="ide-terminal-header">
            <span>TERMINAL</span>
            <button className="btn btn-secondary terminal-clear-button" onClick={() => setFlashLogs([])}>
              Clear
            </button>
          </div>
          <div ref={terminalRef} className="terminal ide-terminal">
            {flashLogs.length === 0 ? (
              <div className="terminal-muted">STM32_Programmer_CLI logs will appear here...</div>
            ) : (
              flashLogs.map((log, index) => (
                <div key={index} className={`terminal-line ${log.type || 'info'}`}>
                  {String(log.text).trim()}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
