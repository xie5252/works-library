import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { qAll, qGet, qRun, now, type WorkRow, type Env } from '../db'
import { requireAuth } from './auth'

const works = new Hono<{ Bindings: Env }>()

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
    views: r.views ?? 0,
    deleted_at: r.deleted_at,
  }
}

// LIKE 关键词转义
const likeEscape = (s: string) => s.replace(/[\\%_]/g, '\\$&')

const SEARCH_SQL =
  " AND (title LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\' OR categories LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')"

// ---------- 前台接口（仅 published） ----------

works.get('/works', async (c) => {
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
  // 排序：默认视图（无分类筛选、无搜索）精选置顶；分类筛选/搜索 = 纯时间线（更新时间从新到旧）
  if (!category && !q) {
    sql += ' ORDER BY (featured_order IS NULL), featured_order ASC, updated_at DESC'
  } else {
    sql += ' ORDER BY updated_at DESC'
  }
  const rows = await qAll<WorkRow>(c.env.DB, sql, ...params)
  return c.json(rows.map(parseRow))
})

works.get('/works/:slug', async (c) => {
  const r = await qGet<WorkRow>(
    c.env.DB,
    "SELECT * FROM works WHERE slug=? AND status='published' AND deleted_at IS NULL",
    c.req.param('slug'),
  )
  if (!r) return c.json({ error: '作品不存在' }, 404)
  // 浏览统计：详情每访问一次 PV+1；cookie 去重 UV（同一天同一浏览器只算 1 个访客，cookie 一年有效）
  let views = r.views ?? 0
  try {
    // 东八区日期，避免 UTC 导致晚间访问记到前一天
    const date = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
    const isNewVisitor = !getCookie(c, 'vuid')
    if (isNewVisitor) {
      setCookie(c, 'vuid', crypto.randomUUID(), {
        path: '/',
        maxAge: 365 * 24 * 3600,
        sameSite: 'Lax',
      })
    }
    await qRun(c.env.DB, 'UPDATE works SET views = COALESCE(views, 0) + 1 WHERE id=?', r.id)
    await qRun(
      c.env.DB,
      `INSERT INTO stats_daily (date, views, uv) VALUES (?, 1, ?)
       ON CONFLICT(date) DO UPDATE SET views = views + 1, uv = uv + ?`,
      date,
      isNewVisitor ? 1 : 0,
      isNewVisitor ? 1 : 0,
    )
    views += 1
  } catch {
    // 统计失败静默
  }
  return c.json({ ...parseRow(r), views })
})

// 数据面板（后台）：汇总卡 + 近 30 天趋势 + 作品浏览 TOP10
works.get('/admin/stats', requireAuth, async (c) => {
  const date = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
  const start = new Date(Date.now() + 8 * 3600 * 1000 - 29 * 86400 * 1000).toISOString().slice(0, 10)
  const [total, todayRow, countRow, uvTotal] = await Promise.all([
    qGet<{ v: number }>(c.env.DB, 'SELECT COALESCE(SUM(views), 0) AS v FROM works'),
    qGet<{ views: number; uv: number }>(
      c.env.DB,
      'SELECT views, uv FROM stats_daily WHERE date=?',
      date,
    ),
    qGet<{ v: number }>(
      c.env.DB,
      "SELECT COUNT(*) AS v FROM works WHERE deleted_at IS NULL AND status='published'",
    ),
    qGet<{ v: number }>(c.env.DB, 'SELECT COALESCE(SUM(uv), 0) AS v FROM stats_daily'),
  ])
  // 近 30 天趋势：缺数据的日期补 0
  const rows = await qAll<{ date: string; views: number; uv: number }>(
    c.env.DB,
    'SELECT date, views, uv FROM stats_daily WHERE date >= ? ORDER BY date',
    start,
  )
  const byDate = new Map(rows.map((r) => [r.date, r]))
  const trend: { date: string; views: number; uv: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() + 8 * 3600 * 1000 - i * 86400 * 1000).toISOString().slice(0, 10)
    const r = byDate.get(d)
    trend.push({ date: d, views: r?.views ?? 0, uv: r?.uv ?? 0 })
  }
  const top = await qAll<{ slug: string; title: string; views: number }>(
    c.env.DB,
    "SELECT slug, title, COALESCE(views, 0) AS views FROM works WHERE deleted_at IS NULL AND status='published' ORDER BY views DESC, updated_at DESC LIMIT 10",
  )
  const worksCount = countRow?.v ?? 0
  return c.json({
    total_views: total?.v ?? 0,
    today_views: todayRow?.views ?? 0,
    today_uv: todayRow?.uv ?? 0,
    total_uv: uvTotal?.v ?? 0,
    works_count: worksCount,
    avg_views: worksCount > 0 ? Math.round((total?.v ?? 0) / worksCount) : 0,
    trend,
    top,
  })
})

// ---------- 后台接口（含草稿） ----------

works.get('/admin/works', requireAuth, async (c) => {
  const { q } = c.req.query()
  let sql = 'SELECT * FROM works WHERE deleted_at IS NULL'
  const params: string[] = []
  if (q && q.trim()) {
    const like = `%${likeEscape(q.trim())}%`
    sql += SEARCH_SQL
    params.push(like, like, like, like, like)
  }
  sql += ' ORDER BY updated_at DESC'
  const rows = await qAll<WorkRow>(c.env.DB, sql, ...params)
  return c.json(rows.map(parseRow))
})

works.get('/admin/works/:id', requireAuth, async (c) => {
  const r = await qGet<WorkRow>(
    c.env.DB,
    'SELECT * FROM works WHERE id=? AND deleted_at IS NULL',
    c.req.param('id'),
  )
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
  const info = await qRun(
    c.env.DB,
    `INSERT INTO works (title, slug, category, categories, tags, cover, cover_source, content, status, featured_order, bg_theme, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  const r = await qGet<WorkRow>(c.env.DB, 'SELECT * FROM works WHERE id=?', info.meta.last_row_id)
  return c.json(parseRow(r as WorkRow), 201)
})

works.put('/admin/works/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const existing = await qGet<WorkRow>(
    c.env.DB,
    'SELECT * FROM works WHERE id=? AND deleted_at IS NULL',
    id,
  )
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
  await qRun(
    c.env.DB,
    `UPDATE works SET title=?, category=?, categories=?, tags=?, cover=?, cover_source=?, content=?, status=?, featured_order=?, bg_theme=?, updated_at=? WHERE id=?`,
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
  const r = await qGet<WorkRow>(c.env.DB, 'SELECT * FROM works WHERE id=?', id)
  return c.json(parseRow(r as WorkRow))
})

// ---------- 回收站 ----------

// 已删除列表（最新删除在前）
works.get('/admin/works-deleted', requireAuth, async (c) => {
  const rows = await qAll<WorkRow>(
    c.env.DB,
    'SELECT * FROM works WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC',
  )
  return c.json(rows.map(parseRow))
})

// 恢复（必须在 /admin/works/:id 之前注册）
works.put('/admin/works/:id/restore', requireAuth, async (c) => {
  const info = await qRun(
    c.env.DB,
    'UPDATE works SET deleted_at=NULL, updated_at=? WHERE id=? AND deleted_at IS NOT NULL',
    now(),
    c.req.param('id'),
  )
  if (info.meta.changes === 0) return c.json({ error: '作品不存在或未删除' }, 404)
  const r = await qGet<WorkRow>(c.env.DB, 'SELECT * FROM works WHERE id=?', c.req.param('id'))
  return c.json(parseRow(r as WorkRow))
})

// 彻底删除（不可恢复；不删 R2 文件，可能被其他作品引用）
works.delete('/admin/works/:id/purge', requireAuth, async (c) => {
  const info = await qRun(
    c.env.DB,
    'DELETE FROM works WHERE id=? AND deleted_at IS NOT NULL',
    c.req.param('id'),
  )
  if (info.meta.changes === 0) return c.json({ error: '作品不存在或未删除' }, 404)
  return c.json({ ok: true })
})

// 软删除：deleted_at 标记，可恢复
works.delete('/admin/works/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const info = await qRun(
    c.env.DB,
    'UPDATE works SET deleted_at=?, updated_at=? WHERE id=? AND deleted_at IS NULL',
    now(),
    now(),
    id,
  )
  if (info.meta.changes === 0) return c.json({ error: '作品不存在' }, 404)
  return c.json({ ok: true })
})

export const worksRoutes = works
