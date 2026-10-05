import { Hono } from 'hono'
import type { Env } from './db'
import { adminRoutes } from './routes/auth'
import { worksRoutes } from './routes/works'
import { uploadRoutes } from './routes/upload'
import { settingsRoutes } from './routes/settings'
import { categoriesPublicRoutes, categoriesAdminRoutes } from './routes/categories'

const app = new Hono<{ Bindings: Env }>()

app.route('/api/admin', adminRoutes)
app.route('/api/admin', uploadRoutes)
app.route('/api/admin', settingsRoutes)
app.route('/api/admin', categoriesAdminRoutes)
app.route('/api', worksRoutes)
app.route('/api', categoriesPublicRoutes)

app.get('/api/health', (c) => c.json({ ok: true }))

// 媒体文件：从 R2 流式读取（key = covers/xxx.jpg 等）
app.get('/media/*', async (c) => {
  let key = c.req.path.replace(/^\/media\//, '')
  try {
    key = decodeURIComponent(key)
  } catch {
    return c.text('Not Found', 404)
  }
  if (!key || key.includes('..') || key.includes('\\')) return c.text('Not Found', 404)
  const obj = await c.env.MEDIA.get(key)
  if (!obj) return c.text('Not Found', 404)
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('etag', obj.httpEtag)
  // 文件名随机唯一，可永久缓存
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  return new Response(obj.body, { headers })
})

export default app
