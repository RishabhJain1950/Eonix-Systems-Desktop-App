import { useEonix } from '../../context/EonixContext'

export default function Titlebar() {
  const { connected } = useEonix()

  const minimizeWindow = () => window.eonix?.window?.minimize()
  const maximizeWindow = () => window.eonix?.window?.maximize()
  const closeWindow = () => window.eonix?.window?.close()
  const keepButtonClickable = (event) => event.stopPropagation()

  return (
    <div className="titlebar">
      <div className="titlebar-logo">
        <img className="titlebar-logo-img" src="/assets/eonix-app-logo.png" alt="Eonix Logo" />
        <span>Eonix</span>
      </div>
      <div className="titlebar-center">
        <div className={`titlebar-status-dot ${connected ? 'connected' : ''}`} />
        <span>{connected ? 'SAM connected' : 'Waiting for SAM...'}</span>
      </div>
      <div className="titlebar-controls">
        <button type="button" className="titlebar-btn" aria-label="Minimize" onMouseDown={keepButtonClickable} onClick={minimizeWindow}>
          <span aria-hidden="true">&#8722;</span>
        </button>
        <button type="button" className="titlebar-btn" aria-label="Maximize" onMouseDown={keepButtonClickable} onClick={maximizeWindow}>
          <span aria-hidden="true">&#9633;</span>
        </button>
        <button type="button" className="titlebar-btn close" aria-label="Close" onMouseDown={keepButtonClickable} onClick={closeWindow}>
          <span aria-hidden="true">&#215;</span>
        </button>
      </div>
    </div>
  )
}
