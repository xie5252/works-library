import { Hono } from 'hono'
import { db } from '../db'
import { requireAuth } from './auth'

const settings = new Hono()

const PUBLIC_KEYS = ['logo', 'site_name', 'site_name_en', 'footer_text']

// 公开接口：前台读取 Logo、网站名称、英文副标题、版权署名
settings.get('/settings', (c) => {
  const rows = db
    .prepare(
      `SELECT key, value FROM settings WHERE key IN ('logo','site_name','site_name_en','footer_text')`,
    )
    .all() as { key: string; value: string }[]
  const obj: Record<string, string> = {}
  for (const r of rows) obj[r.key] = r.value
  return c.json({
    logo: obj.logo || null,
    site_name: obj.site_name || '作品库',
    site_name_en: obj.site_name_en || '',
    footer_text: obj.footer_text || '',
  })
})

settings.put('/settings', requireAuth, async (c) => {
  const body = await c.req.json<{
    logo?: string
    site_name?: string
    site_name_en?: string
    footer_text?: string
  }>()
  for (const key of PUBLIC_KEYS) {
    const value = body[key as keyof typeof body]
    if (value !== undefined) {
      db.prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
      ).run(key, value)
    }
  }
  return c.json({ ok: true })
})

export const settingsRoutes = settings
