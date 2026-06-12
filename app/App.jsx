import { HashRouter, Route, Routes } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import { EonixProvider } from './context/EonixContext'

import CodeGen from './pages/CodeGen'
import Dashboard from './pages/Dashboard'
import IDE from './pages/IDE'
import Modules from './pages/Modules'
import Telemetry from './pages/Telemetry'

function AppLayout() {
  return (
    <div className="app-shell">
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
