import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@/features': path.resolve(import.meta.dirname, './src/features'),
      '@/components': path.resolve(import.meta.dirname, './src/components'),
      '@/hooks': path.resolve(import.meta.dirname, './src/hooks'),
      '@/lib': path.resolve(import.meta.dirname, './src/lib'),
      '@/types': path.resolve(import.meta.dirname, './src/types'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    pool: 'threads',
  },
})
