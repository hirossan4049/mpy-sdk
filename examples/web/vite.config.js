import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    fs: {
      // Allow serving files from parent directories
      allow: ['..', '../..']
    }
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    lib: false,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  resolve: {
    alias: {
      '@h1mpy-sdk/web': '../../packages/web/src/index.ts',
      '@h1mpy-sdk/core': '../../packages/core/src/index.ts'
    }
  },
  optimizeDeps: {
    exclude: ['@h1mpy-sdk/web', '@h1mpy-sdk/core', 'serialport', 'events']
  },
  define: {
    global: 'globalThis',
  }
});