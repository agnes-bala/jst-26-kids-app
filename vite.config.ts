import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { ProxyOptions } from 'vite'

const BACKEND = 'http://10.12.1.118:8081' // YOUR SPRING BOOT SERVER

// Spring answers "403 Invalid CORS request" when the Origin header
// (http://localhost:5173) does not match the backend host. Removing the
// Origin header in the proxy makes the request look same-origin to Spring.
const proxyOptions: ProxyOptions = {
  target: BACKEND,
  changeOrigin: true,
  secure: false,
  configure: (proxy) => {
    proxy.on('proxyReq', (proxyReq) => {
      proxyReq.removeHeader('origin')
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': proxyOptions, // kids + attendance (+ api/user)
      '/jr_mobile': proxyOptions, // jr_mobile/user ...
      '/jrmobile': proxyOptions, // old spelling - remove once you confirm the real path
    },
  },
})