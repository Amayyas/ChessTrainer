import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // The manifest lets the size guard tell the initial bundle apart from the
    // lazily loaded route chunks, so its budget measures first-load JS only.
    manifest: true,
  },
  server: {
    port: 5173,
    open: false,
  },
  test: {
    environment: 'jsdom',
    // Tests always run as if no backend were configured: that is what CI sees
    // (it holds no secrets) and it keeps them off the network entirely.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/test/**',
        'src/**/*.{test,spec}.{ts,tsx}',
      ],
    },
  },
})
