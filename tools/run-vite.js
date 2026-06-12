const { spawn } = require('child_process')
const path = require('path')

const viteBin = path.join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js')

const childEnv = { ...process.env }
delete childEnv.ELECTRON_RUN_AS_NODE

const child = spawn(process.execPath, [viteBin, ...process.argv.slice(2)], {
  cwd: path.join(__dirname, '..'),
  env: childEnv,
  stdio: 'inherit',
  shell: false,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
