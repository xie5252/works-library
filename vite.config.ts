import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import devServer from '@hono/vite-dev-server'
import cloudflareAdapter from '@hono/vite-dev-server/cloudflare'

// dev server 安全拦截：在最前面拒绝路径穿越与敏感目录访问
// （生产环境由 Worker + assets 托管，不受影响）
const blockSensitivePaths: Plugin = {
  name: 'block-sensitive-paths',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const raw = req.url || ''
      let decoded = raw
      try {
        decoded = decodeURIComponent(raw)
      } catch {
        res.statusCode = 400
        res.end('Bad Request')
        return
      }
      if (decoded.includes('..') || decoded.startsWith('/data/') || decoded.includes('\\')) {
        res.statusCode = 404
        res.end('Not Found')
        return
      }
      next()
    })
  },
}

export default defineConfig({
  plugins: [
    blockSensitivePaths,
    react(),
    tailwindcss(),
    devServer({
      entry: 'server/worker.ts',
      // Cloudflare 适配器：本地通过 getPlatformProxy 提供 D1 / R2 绑定（与线上一致）
      adapter: await cloudflareAdapter(),
      // 只把 API 和媒体文件交给 Hono，其余（页面路由）走 Vite SPA
      exclude: [/^(?!\/api\/|\/media\/).*/],
    }),
  ],
  server: {
    port: 5173,
    fs: {
      deny: ['data/**', '**/.env*', '**/.dev.vars'],
    },
  },
})
