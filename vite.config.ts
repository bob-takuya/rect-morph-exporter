import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: '/rect-morph/',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    sourcemap: false,
  },
  server: {
    // Suppress source map warnings
    fs: {
      strict: false
    }
  },
  assetsInclude: ['**/*.frag', '**/*.vert', '**/*.glsl'],
  define: {
    global: 'globalThis',
  }
})
