const { SerialPort } = require('serialport')

function frame(obj) {
  const json = Buffer.from(JSON.stringify(obj), 'utf8')
  const hdr = Buffer.alloc(4)
  hdr.writeUInt32LE(json.length, 0)
  return Buffer.concat([hdr, json])
}

async function main() {
  const portPath = process.argv[2] || 'COM8'
  const baudRate = Number(process.argv[3] || 115200)

  const port = new SerialPort({ path: portPath, baudRate })
  let rx = Buffer.alloc(0)

  port.on('error', (e) => {
    console.error('PORT_ERROR', e.message)
    process.exit(1)
  })

  port.on('data', (d) => {
    rx = Buffer.concat([rx, d])
    while (rx.length >= 4) {
      const n = rx.readUInt32LE(0)
      if (rx.length < 4 + n) break
      const payload = rx.slice(4, 4 + n).toString('utf8')
      console.log('RX_JSON', payload)
      rx = rx.slice(4 + n)
    }
  })

  await new Promise((res) => port.once('open', res))
  console.log('OPEN_OK', { portPath, baudRate })

  port.write(frame({ cmd: 'get_modules' }))
  console.log('TX', { cmd: 'get_modules' })

  setTimeout(() => {
    console.log('DONE')
    port.close(() => process.exit(0))
  }, 2500)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

