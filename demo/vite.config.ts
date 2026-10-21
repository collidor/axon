import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8'),
)

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/axon/' : './',
  define: {
    __AXON_VERSION__: JSON.stringify(pkg.version || '0.1.0'),
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) =>
            tag.startsWith('ui-') ||
            tag.startsWith('axon-'),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@collidor/axon/web-components': resolve(__dirname, '../src/web-components/index.ts'),
      '@collidor/axon/headless': resolve(__dirname, '../src/headless.ts'),
      '@collidor/axon/nodes': resolve(__dirname, '../src/nodes/index.ts'),
      '@collidor/axon/compiler': resolve(__dirname, '../src/compiler/index.ts'),
      '@collidor/axon/core': resolve(__dirname, '../src/core/index.ts'),
      '@collidor/axon/systems': resolve(__dirname, '../src/systems/index.ts'),
      '@collidor/axon': resolve(__dirname, '../src/index.ts'),
    },
  },
  esbuild: {
    keepNames: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  server: {
    port: 5174,
    open: true,
  },
})
