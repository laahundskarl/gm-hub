import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'e2e'],
    server: { deps: { inline: [/next-intl/, /^next$/, /^next\//] } },
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
