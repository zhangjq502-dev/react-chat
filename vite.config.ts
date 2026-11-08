import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    // 开发时把 /api 转发给本地 Node 服务，前端不用处理跨域
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
