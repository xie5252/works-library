import { Hono } from 'hono'
import { requireAuth } from './auth'
import { writeFileSync, mkdirSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

const upload = new Hono()

const RULES: Record<string, { dir: string; exts: string[]; maxMB: number }> = {
  logo: { dir: 'logo', exts: ['png', 'jpg', 'jpeg', 'webp', 'svg'], maxMB: 5 },
  cover: { dir: 'covers', exts: ['png', 'jpg', 'jpeg', 'webp'], maxMB: 20 },
  image: { dir: 'images', exts: ['png', 'jpg', 'jpeg', 'webp'], maxMB: 20 },
  video: { dir: 'videos', exts: ['mp4', 'webm'], maxMB: 200 },
  pdf: { dir: 'pdfs', exts: ['pdf'], maxMB: 50 },
}

upload.post('/upload', requireAuth, async (c) => {
  const type = c.req.query('type') || 'image'
  const rule = RULES[type]
  if (!rule) return c.json({ error: '上传类型不支持' }, 400)

  const body = await c.req.parseBody()
  const file = body['file']
  if (!(file instanceof File)) return c.json({ error: '没有收到文件' }, 400)

  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!rule.exts.includes(ext)) {
    return c.json({ error: `不支持的格式，仅支持：${rule.exts.join(' / ')}` }, 400)
  }
  if (file.size > rule.maxMB * 1024 * 1024) {
    return c.json({ error: `文件过大，最大 ${rule.maxMB}MB` }, 400)
  }

  const name = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}.${ext}`
  const dir = join(process.cwd(), 'media', rule.dir)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, name), Buffer.from(await file.arrayBuffer()))

  return c.json({ url: `/media/${rule.dir}/${name}` })
})

export const uploadRoutes = upload
