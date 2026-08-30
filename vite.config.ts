import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  optimizeDeps: { exclude: ['@mtcute/wasm'] },
  build: {
    target: 'chrome116',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        options: resolve(root, 'options.html'),
        popup: resolve(root, 'popup.html'),
        offscreen: resolve(root, 'offscreen.html'),
        'service-worker': resolve(root, 'src/service-worker.ts')
      },
      output: {
        entryFileNames: (chunk) => chunk.name === 'service-worker' ? 'service-worker.js' : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
})
