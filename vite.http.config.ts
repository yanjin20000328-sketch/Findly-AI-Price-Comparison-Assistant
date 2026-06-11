import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:3001'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5183,
    proxy: {
      '/api/search': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/api/recognize-image': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/api/ai-reasoning': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/api/top1-discussion': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/api/compare-products': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/api/agent': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/api/recognize-intent': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/api/taobao-detail': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/api/amazon-detail': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
