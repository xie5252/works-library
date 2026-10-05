import { Hono } from 'hono'
import { requireAuth } from './auth'
import type { Env } from '../db'

const upload = new Hono<{ Bindings: Env }>()

// 视频上限 95MB：Workers 免费版单请求体上限 100MB
const RULES: Record<string, { dir: string; exts: string[]; maxMB: number }> = {
  logo: { dir: 'logo', exts: ['png', 'jpg', 'jpeg', 'webp', 'svg'], maxMB: 5 },
  cover: { dir: 'covers', exts: ['png', 'jpg', 'jpeg', 'webp'], maxMB: 20 },
  image: { dir: 'images', exts: ['png', 'jpg', 'jpeg', 'webp'], maxMB: 20 },
  video: { dir: 'videos', exts: ['mp4', 'webm'], maxMB: 95 },
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

  // R2 对象 key = 分类目录/随机文件名；文件名随机不可枚举
  const name = `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint8Array(4)).join('')}.${ext}`
  const key = `${rule.dir}/${name}`
  // 用 ArrayBuffer（长度已知）；本地 miniflare R2 不接受不定长 stream
  await c.env.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  })

  return c.json({ url: `/media/${key}` })
})

export const uploadRoutes = upload
