import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    https: false, // Web Serial API works over HTTPS or localhost
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@hirossan4049/mpy-sdk/browser': '../../dist/browser/browser.js'
    }
  },
  optimizeDeps: {
    include: ['@hirossan4049/mpy-sdk']
  }
});