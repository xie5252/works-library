import { Hono } from 'hono'
import { qAll, qGet, qRun, now, type Env } from '../db'
import { requireAuth } from './auth'

// 公开接口：前台/编辑器读取分类列表
const publicCat = new Hono<{ Bindings: Env }>()

publicCat.get('/categories', async (c) => {
  const rows = await qAll<{ id: number; name: string; sort: number }>(
    c.env.DB,
    'SELECT id, name, sort FROM categories ORDER BY sort ASC, id ASC',
  )
  return c.json(rows)
})

// 后台接口：分类增删改排序
const adminCat = new Hono<{ Bindings: Env }>()

interface CategoryRow {
  id: number
  name: string
  sort: number
  created_at: string
}

adminCat.post('/categories', requireAuth, async (c) => {
  const { name } = await c.req.json<{ name?: string }>()
  const trimmed = name?.trim() ?? ''
  if (!trimmed) return c.json({ error: '分类名不能为空' }, 400)
  if (trimmed.length > 12) return c.json({ error: '分类名最多 12 个字' }, 400)
  const exists = await qGet(c.env.DB, 'SELECT id FROM categories WHERE name=?', trimmed)
  if (exists) return c.json({ error: '该分类已存在' }, 400)
  const maxSort = await qGet<{ m: number }>(
    c.env.DB,
    'SELECT COALESCE(MAX(sort), 0) m FROM categories',
  )
  const info = await qRun(
    c.env.DB,
    'INSERT INTO categories (name, sort, created_at) VALUES (?, ?, ?)',
    trimmed,
    (maxSort?.m ?? 0) + 1,
    now(),
  )
  const row = await qGet(c.env.DB, 'SELECT * FROM categories WHERE id=?', info.meta.last_row_id)
  return c.json(row, 201)
})

// 拖拽排序：按前端给的新顺序批量写入 sort（必须注册在 /categories/:id 之前，否则被 :id 捕获）
adminCat.put('/categories/reorder', requireAuth, async (c) => {
  const { ids } = await c.req.json<{ ids?: number[] }>()
  if (!Array.isArray(ids) || ids.length === 0) return c.json({ error: '参数错误' }, 400)
  const total = await qGet<{ m: number }>(c.env.DB, 'SELECT COUNT(*) m FROM categories')
  if (ids.length !== (total?.m ?? 0)) return c.json({ error: '分类数量不一致，请刷新后重试' }, 400)
  await c.env.DB.batch(
    ids.map((cid, i) =>
      c.env.DB.prepare('UPDATE categories SET sort=? WHERE id=?').bind(i + 1, cid),
    ),
  )
  return c.json({ ok: true })
})

// 改名 / 拖拽排序（direction，兼容旧版上下移动）
adminCat.put('/categories/:id', requireAuth, async (c) => {
  const id = Number(c.req.param('id'))
  const row = await qGet<CategoryRow>(c.env.DB, 'SELECT * FROM categories WHERE id=?', id)
  if (!row) return c.json({ error: '分类不存在' }, 404)
  const body = await c.req.json<{ name?: string; direction?: 'up' | 'down' }>()

  if (body.name !== undefined) {
    const trimmed = body.name.trim()
    if (!trimmed) return c.json({ error: '分类名不能为空' }, 400)
    const dup = await qGet(c.env.DB, 'SELECT id FROM categories WHERE name=? AND id!=?', trimmed, id)
    if (dup) return c.json({ error: '该分类已存在' }, 400)
    if (trimmed !== row.name) {
      await qRun(c.env.DB, 'UPDATE categories SET name=? WHERE id=?', trimmed, id)
      // 级联更新作品里的分类文字（主分类列 + 多分类 JSON 数组，含回收站作品）
      // 作品量级小，直接全量拉回在 JS 里精确匹配，避免 LIKE 通配符转义问题
      await qRun(c.env.DB, 'UPDATE works SET category=? WHERE category=?', trimmed, row.name)
      const rows = await qAll<{ id: number; categories: string | null }>(
        c.env.DB,
        'SELECT id, categories FROM works WHERE categories IS NOT NULL',
      )
      for (const r of rows) {
        try {
          const arr = JSON.parse(r.categories || '[]')
          if (Array.isArray(arr) && arr.includes(row.name)) {
            await qRun(
              c.env.DB,
              'UPDATE works SET categories=? WHERE id=?',
              JSON.stringify(arr.map((n) => (n === row.name ? trimmed : n))),
              r.id,
            )
          }
        } catch {
          // 单条 JSON 异常跳过，不影响其余
        }
      }
    }
  }

  if (body.direction) {
    const neighborSql =
      body.direction === 'up'
        ? 'SELECT * FROM categories WHERE sort < ? ORDER BY sort DESC, id DESC LIMIT 1'
        : 'SELECT * FROM categories WHERE sort > ? ORDER BY sort ASC, id ASC LIMIT 1'
    const neighbor = await qGet<CategoryRow>(c.env.DB, neighborSql, row.sort)
    if (neighbor) {
      // D1 batch 内两条语句原子执行（等价事务）
      await c.env.DB.batch([
        c.env.DB.prepare('UPDATE categories SET sort=? WHERE id=?').bind(neighbor.sort, row.id),
        c.env.DB.prepare('UPDATE categories SET sort=? WHERE id=?').bind(row.sort, neighbor.id),
      ])
    }
  }

  return c.json(await qGet(c.env.DB, 'SELECT * FROM categories WHERE id=?', id))
})

// 删除分类（已有作品保留原分类文字，仅从选项中移除）
adminCat.delete('/categories/:id', requireAuth, async (c) => {
  const info = await qRun(c.env.DB, 'DELETE FROM categories WHERE id=?', c.req.param('id'))
  if (info.meta.changes === 0) return c.json({ error: '分类不存在' }, 404)
  return c.json({ ok: true })
})

export { publicCat as categoriesPublicRoutes, adminCat as categoriesAdminRoutes }
