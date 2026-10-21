import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        core: resolve(__dirname, 'src/core/index.ts'),
        headless: resolve(__dirname, 'src/headless.ts'),
        systems: resolve(__dirname, 'src/systems/index.ts'),
        nodes: resolve(__dirname, 'src/nodes/index.ts'),
        compiler: resolve(__dirname, 'src/compiler/index.ts'),
        state: resolve(__dirname, 'src/state/index.ts'),
        'web-components': resolve(__dirname, 'src/web-components/index.ts'),
      },
      name: 'Axon',
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        '@collidor/command',
        '@collidor/struct',
        '@collidor/struct-command',
        '@collidor/struct-event',
        '@collidor/toolkit',
        '@collidor/ui',
        'zod',
      ],
      output: {
        globals: {
          '@collidor/command': 'CollidorCommand',
          '@collidor/struct': 'CollidorStruct',
          '@collidor/struct-command': 'CollidorStructCommand',
          '@collidor/struct-event': 'CollidorStructEvent',
          '@collidor/toolkit': 'CollidorToolkit',
          '@collidor/ui': 'CollidorUI',
        },
      },
    },
  },
})
