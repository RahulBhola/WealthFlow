import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@/features': path.resolve(import.meta.dirname, './src/features'),
      '@/components': path.resolve(import.meta.dirname, './src/components'),
      '@/hooks': path.resolve(import.meta.dirname, './src/hooks'),
      '@/lib': path.resolve(import.meta.dirname, './src/lib'),
      '@/types': path.resolve(import.meta.dirname, './src/types'),
    },
  },
})
