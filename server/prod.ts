// 生产入口：vite build 后运行 `npm start`
// 用法：PORT=3000 npm start （HTTPS 反代时另加 COOKIE_SECURE=1）
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import app from './index'

const prod = new Hono()

// API 与媒体文件（media 已限制在 media/ 目录内）
prod.route('/', app)

// 前端构建产物
prod.use('*', async (c, next) => {
  if (c.req.path.includes('..')) return c.text('Not Found', 404)
  await next()
})
prod.use('/assets/*', serveStatic({ root: './dist' }))
prod.use('/robots.txt', serveStatic({ path: './dist/robots.txt' }))

// 未注册的 API 返回 404 JSON（而不是 SPA 页面）
prod.use('/api/*', async (c) => c.json({ error: '接口不存在' }, 404))

// SPA fallback：/admin、/work/:slug 等页面路由刷新时返回 index.html
prod.get('*', serveStatic({ path: './dist/index.html' }))

const port = Number(process.env.PORT) || 3000
serve({ fetch: prod.fetch, port }, () => {
  console.log(`作品库已启动: http://localhost:${port}`)
})
