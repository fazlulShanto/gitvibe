import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  dts: true,
  outDir: 'dist',
  target: 'ES2020',
  format: ['cjs'],
  sourcemap: true,
  clean: true,
  logLevel: 'error',
  external: ['keytar', 'simple-git'],
  shims: true,
})