// Node 版入口（阿里云服务器部署用）：同一套 Hono 应用，绑定换成本地适配层
//   数据 = SQLite 文件（D1 导出导入），媒体 = 本地磁盘目录（nginx 直接出图）
// 环境变量：PORT(默认 8788)、DB_PATH、MEDIA_DIR、SECRET
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import path from 'node:path'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import Database from 'better-sqlite3'
import worker from './worker'
import type { Env } from './db'
import { LocalD1, LocalR2 } from './adapters/local'

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'works.db')
const mediaDir = process.env.MEDIA_DIR || path.join(process.cwd(), 'media')
const distDir = path.join(process.cwd(), 'dist')
const secret = process.env.SECRET

if (!secret) {
  console.error('[启动失败] 缺少 SECRET 环境变量（登录 cookie 签名密钥）')
  process.exit(1)
}

// 启动迁移：老库自动补齐新增列/表（幂等，可重复执行）
{
  const m = new Database(dbPath)
  m.pragma('journal_mode = WAL')
  const cols = m.pragma('table_info(works)') as { name: string }[]
  if (Array.isArray(cols) && cols.length > 0 && !cols.some((c) => c.name === 'views')) {
    m.exec('ALTER TABLE works ADD COLUMN views INTEGER NOT NULL DEFAULT 0')
    console.log('[迁移] works 已添加 views 列')
  }
  m.exec(
    `CREATE TABLE IF NOT EXISTS stats_daily (
       date TEXT PRIMARY KEY,
       views INTEGER NOT NULL DEFAULT 0
     )`,
  )
  m.close()
}

const env = {
  DB: new LocalD1(dbPath),
  MEDIA: new LocalR2(mediaDir),
  SECRET: secret,
  COOKIE_SECURE: process.env.COOKIE_SECURE ?? '1',
} as unknown as Env

const app = new Hono<{ Bindings: Env }>()

// 静态资源（dist）：生产由 nginx 直接托管，这里兜底——本地预览无需 nginx 也能看
const STATIC_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript',
  css: 'text/css',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  ico: 'image/x-icon',
  woff2: 'font/woff2',
  txt: 'text/plain; charset=utf-8',
}
app.get('*', async (c, next) => {
  const p = c.req.path
  if (p.startsWith('/api/') || p.startsWith('/media/')) return next()
  if (p.includes('..') || p.includes('\\')) return next()
  const rel = p === '/' ? 'index.html' : p.slice(1)
  let file = path.join(distDir, rel)
  try {
    const s = await stat(file)
    if (s.isDirectory()) return next()
  } catch {
    // 不存在 → SPA 回退 index.html（/work/xxx、/about 等前端路由）
    file = path.join(distDir, 'index.html')
  }
  const ext = (file.split('.').pop() || '').toLowerCase()
  const stream = Readable.toWeb(createReadStream(file)) as unknown as ReadableStream
  const headers = new Headers()
  headers.set('content-type', STATIC_TYPES[ext] || 'application/octet-stream')
  // 指纹命名的 assets 可长缓存，index.html 不缓存保证发版即生效
  if (p.startsWith('/assets/')) headers.set('cache-control', 'public, max-age=31536000, immutable')
  else headers.set('cache-control', 'no-cache')
  return new Response(stream, { headers })
})

app.all('*', (c) => worker.fetch(c.req.raw, env))

const port = Number(process.env.PORT || 8788)
serve({ fetch: app.fetch, port }, () => {
  console.log(`[works-library] Node 服务已启动 :${port}（DB: ${dbPath}）`)
})
