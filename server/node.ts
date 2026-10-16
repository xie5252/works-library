// Node 版入口（阿里云服务器部署用）：同一套 Hono 应用，绑定换成本地适配层
//   数据 = SQLite 文件（D1 导出导入），媒体 = 本地磁盘目录（nginx 直接出图）
// 环境变量：PORT(默认 8788)、DB_PATH、MEDIA_DIR、SECRET
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import path from 'node:path'
import Database from 'better-sqlite3'
import worker from './worker'
import type { Env } from './db'
import { LocalD1, LocalR2 } from './adapters/local'

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'works.db')
const mediaDir = process.env.MEDIA_DIR || path.join(process.cwd(), 'media')
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
app.all('*', (c) => worker.fetch(c.req.raw, env))

const port = Number(process.env.PORT || 8788)
serve({ fetch: app.fetch, port }, () => {
  console.log(`[works-library] Node 服务已启动 :${port}（DB: ${dbPath}）`)
})
