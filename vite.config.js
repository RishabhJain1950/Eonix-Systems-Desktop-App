import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
            rollupOptions: {
              external: ['serialport', 'electron', 'child_process', 'events', 'fs', 'path', 'url', '../device/serial-handler']
            }
          },
        },
      },
      {
        entry: 'electron/preload.js',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
            rollupOptions: {
              external: ['electron']
            }
          },
        },
      },
    ]),
    renderer(),
  ],
  root: '.',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'app'),
    },
  },
})
