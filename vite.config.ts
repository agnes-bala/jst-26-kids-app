import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import type { ProxyOptions } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env / .env.local / .env.[mode] into process.env
  const env = loadEnv(mode, process.cwd(), '')

  const BACKEND = env.SERVICE_URL || env.VITE_SERVICE_URL || 'http://10.12.1.118:8081'

  const proxyOptions: ProxyOptions = {
    target: BACKEND,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.removeHeader('origin')
      })
    },
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': proxyOptions,        // kids + attendance (+ api/user)
        '/jr_mobile': proxyOptions,  // jr_mobile/user ...
        '/jrmobile': proxyOptions,   // old spelling - remove once confirmed
      },
    },
  }
})