import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5180,
    proxy: {
      '/api/search': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/recognize-image': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/ai-reasoning': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/top1-discussion': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/compare-products': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/agent': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/recognize-intent': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/taobao-detail': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/amazon-detail': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
