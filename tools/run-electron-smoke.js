const { spawn } = require('child_process')
const path = require('path')

const electronBin = require('electron')

const childEnv = {
  ...process.env,
  EONIX_SMOKE_TEST: '1',
}
delete childEnv.ELECTRON_RUN_AS_NODE

const child = spawn(electronBin, ['.'], {
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
