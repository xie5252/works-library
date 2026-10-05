import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { adminRoutes } from './routes/auth'
import { worksRoutes } from './routes/works'
import { uploadRoutes } from './routes/upload'
import { settingsRoutes } from './routes/settings'
import { categoriesPublicRoutes, categoriesAdminRoutes } from './routes/categories'

const app = new Hono()

app.route('/api/admin', adminRoutes)
app.route('/api/admin', uploadRoutes)
app.route('/api/admin', settingsRoutes)
app.route('/api/admin', categoriesAdminRoutes)
app.route('/api', worksRoutes)
app.route('/api', categoriesPublicRoutes)

app.get('/api/health', (c) => c.json({ ok: true }))

// 上传的媒体文件：logo / covers / images / videos
// 只允许访问 media/ 目录内部：拒绝 .. 穿越 + 限制 root 在 media 内
app.use('/media/*', async (c, next) => {
  if (c.req.path.includes('..')) return c.text('Not Found', 404)
  await next()
})
app.use(
  '/media/*',
  serveStatic({
    root: './media',
    rewriteRequestPath: (p) => p.replace(/^\/media/, ''),
  }),
)

export default app
