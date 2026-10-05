import { Hono } from 'hono'
import { db, now, type WorkRow } from '../db'
import { requireAuth } from './auth'

const works = new Hono()

export function parseRow(r: WorkRow) {
  let content: unknown = []
  try {
    content = JSON.parse(r.content)
  } catch {
    content = []
  }
  let categories: string[] = [r.category]
  try {
    const parsed = JSON.parse(r.categories)
    if (Array.isArray(parsed) && parsed.length > 0) categories = parsed
  } catch {
    // fallback 保持 [category]
  }
  let tags: string[] = []
  try {
    const parsed = JSON.parse(r.tags)
    if (Array.isArray(parsed)) tags = parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    // tags 保持 []
  }
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    category: categories[0] || r.category,
    categories,
    tags,
    cover: r.cover,
    cover_source: r.cover_source ?? null,
    content,
    status: r.status,
    featured_order: r.featured_order,
    bg_theme: r.bg_theme === 'dark' ? 'dark' : 'light',
    created_at: r.created_at,
    updated_at: r.updated_at,
    deleted_at: r.deleted_at,
  }
}

// LIKE 关键词转义
const likeEscape = (s: string) => s.replace(/[\\%_]/g, '\\$&')

const SEARCH_SQL =
  " AND (title LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\' OR categories LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')"

// ---------- 前台接口（仅 published） ----------

works.get('/works', (c) => {
  const { category, q, featured } = c.req.query()
  let sql = "SELECT * FROM works WHERE status='published' AND deleted_at IS NULL"
  const params: string[] = []
  if (featured === '1') {
    sql += ' AND featured_order IS NOT NULL'
  }
  if (category && category !== '全部') {
    // 多分类：主分类或 JSON 数组中包含该分类（精确匹配元素）
    sql += " AND (category = ? OR categories LIKE ? ESCAPE '\\')"
    params.push(category, `%"${likeEscape(category)}"%`)
  }
  if (q && q.trim()) {
    const like = `%${likeEscape(q.trim())}%`
    sql += SEARCH_SQL
    params.push(like, like, like, like, like)
  }
  // 精选置顶：featured_order 小者在前，非精选按时间
  sql += ' ORDER BY (featured_order IS NULL), featured_order ASC, updated_at DESC'
  const rows = db.prepare(sql).all(...params) as WorkRow[]
  return c.json(rows.map(parseRow))
})

works.get('/works/:slug', (c) => {
  const r = db
    .prepare(
      "SELECT * FROM works WHERE slug=? AND status='published' AND deleted_at IS NULL",
    )
    .get(c.req.param('slug')) as WorkRow | undefined
  if (!r) return c.json({ error: '作品不存在' }, 404)
  return c.json(parseRow(r))
})

// ---------- 后台接口（含草稿） ----------

works.get('/admin/works', requireAuth, (c) => {
  const { q } = c.req.query()
  let sql = 'SELECT * FROM works WHERE deleted_at IS NULL'
  const params: string[] = []
  if (q && q.trim()) {
    const like = `%${likeEscape(q.trim())}%`
    sql += SEARCH_SQL
    params.push(like, like, like, like, like)
  }
  sql += ' ORDER BY updated_at DESC'
  const rows = db.prepare(sql).all(...params) as WorkRow[]
  return c.json(rows.map(parseRow))
})

works.get('/admin/works/:id', requireAuth, (c) => {
  const r = db
    .prepare('SELECT * FROM works WHERE id=? AND deleted_at IS NULL')
    .get(c.req.param('id')) as WorkRow | undefined
  if (!r) return c.json({ error: '作品不存在' }, 404)
  return c.json(parseRow(r))
})

interface WorkInput {
  title?: string
  category?: string
  categories?: string[]
  tags?: string[]
  cover?: string | null
  cover_source?: string | null
  content?: unknown[]
  status?: 'draft' | 'published'
  featured_order?: number | null
  bg_theme?: 'light' | 'dark'
}

// 标签规范化：去空格、去空、去重
function normalizeTags(tags: unknown): string {
  let arr: string[] = []
  if (Array.isArray(tags)) {
    arr = tags.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((s) => s.trim())
  }
  return JSON.stringify([...new Set(arr)])
}

// 多分类规范化：过滤空值，空数组回退 [主分类或'其他']；主分类 = 第一个
function normalizeCategories(cats: unknown, fallback: string): { categories: string; category: string } {
  let arr: string[] = []
  if (Array.isArray(cats)) {
    arr = cats.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((s) => s.trim())
  }
  if (arr.length === 0) arr = [fallback.trim() || '其他']
  return { categories: JSON.stringify(arr), category: arr[0] }
}

function genSlug(): string {
  return 'w-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

works.post('/admin/works', requireAuth, async (c) => {
  const body = await c.req.json<WorkInput>()
  const t = now()
  const cats = normalizeCategories(body.categories ?? body.category, body.category || '其他')
  const info = db
    .prepare(
      `INSERT INTO works (title, slug, category, categories, tags, cover, cover_source, content, status, featured_order, bg_theme, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      body.title?.trim() || '未命名作品',
      genSlug(),
      cats.category,
      cats.categories,
      normalizeTags(body.tags),
      body.cover ?? null,
      body.cover ? body.cover_source ?? null : null,
      JSON.stringify(body.content ?? []),
      body.status === 'published' ? 'published' : 'draft',
      typeof body.featured_order === 'number' ? body.featured_order : null,
      body.bg_theme === 'dark' ? 'dark' : 'light',
      t,
      t,
    )
  const r = db.prepare('SELECT * FROM works WHERE id=?').get(info.lastInsertRowid) as WorkRow
  return c.json(parseRow(r), 201)
})

works.put('/admin/works/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const existing = db
    .prepare('SELECT * FROM works WHERE id=? AND deleted_at IS NULL')
    .get(id) as WorkRow | undefined
  if (!existing) return c.json({ error: '作品不存在' }, 404)
  const body = await c.req.json<WorkInput>()
  const cats =
    body.categories === undefined && body.category === undefined
      ? { categories: existing.categories, category: existing.category }
      : normalizeCategories(
          body.categories ?? [body.category ?? existing.category],
          body.category || existing.category,
        )
  // cover_source：封面来源图 URL。封面被清空时同步清空；未提供时保留原值
  const nextCover = body.cover === undefined ? existing.cover : body.cover
  const nextCoverSource = !nextCover
    ? null
    : body.cover_source === undefined
      ? existing.cover_source
      : body.cover_source || null
  db.prepare(
    `UPDATE works SET title=?, category=?, categories=?, tags=?, cover=?, cover_source=?, content=?, status=?, featured_order=?, bg_theme=?, updated_at=? WHERE id=?`,
  ).run(
    body.title?.trim() || existing.title,
    cats.category,
    cats.categories,
    body.tags === undefined ? existing.tags : normalizeTags(body.tags),
    nextCover,
    nextCoverSource,
    body.content === undefined ? existing.content : JSON.stringify(body.content),
    body.status === 'published' ? 'published' : body.status === 'draft' ? 'draft' : existing.status,
    body.featured_order === undefined
      ? existing.featured_order
      : typeof body.featured_order === 'number'
        ? body.featured_order
        : null,
    body.bg_theme === undefined ? existing.bg_theme : body.bg_theme === 'dark' ? 'dark' : 'light',
    now(),
    id,
  )
  const r = db.prepare('SELECT * FROM works WHERE id=?').get(id) as WorkRow
  return c.json(parseRow(r))
})

// ---------- 回收站 ----------

// 已删除列表（最新删除在前）
works.get('/admin/works-deleted', requireAuth, (c) => {
  const rows = db
    .prepare(
      'SELECT * FROM works WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC',
    )
    .all() as WorkRow[]
  return c.json(rows.map(parseRow))
})

// 恢复（必须在 /admin/works/:id 之前注册）
works.put('/admin/works/:id/restore', requireAuth, (c) => {
  const info = db
    .prepare('UPDATE works SET deleted_at=NULL, updated_at=? WHERE id=? AND deleted_at IS NOT NULL')
    .run(now(), c.req.param('id'))
  if (info.changes === 0) return c.json({ error: '作品不存在或未删除' }, 404)
  const r = db.prepare('SELECT * FROM works WHERE id=?').get(c.req.param('id')) as WorkRow
  return c.json(parseRow(r))
})

// 彻底删除（不可恢复；不删 media 文件，可能被其他作品引用）
works.delete('/admin/works/:id/purge', requireAuth, (c) => {
  const info = db
    .prepare('DELETE FROM works WHERE id=? AND deleted_at IS NOT NULL')
    .run(c.req.param('id'))
  if (info.changes === 0) return c.json({ error: '作品不存在或未删除' }, 404)
  return c.json({ ok: true })
})

// 软删除：deleted_at 标记，可恢复
works.delete('/admin/works/:id', requireAuth, (c) => {
  const id = c.req.param('id')
  const info = db
    .prepare('UPDATE works SET deleted_at=?, updated_at=? WHERE id=? AND deleted_at IS NULL')
    .run(now(), now(), id)
  if (info.changes === 0) return c.json({ error: '作品不存在' }, 404)
  return c.json({ ok: true })
})

export const worksRoutes = works
