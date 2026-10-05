import { Hono } from 'hono'
import { db, now } from '../db'
import { requireAuth } from './auth'

// 公开接口：前台/编辑器读取分类列表
const publicCat = new Hono()

publicCat.get('/categories', (c) => {
  const rows = db
    .prepare('SELECT id, name, sort FROM categories ORDER BY sort ASC, id ASC')
    .all()
  return c.json(rows)
})

// 后台接口：分类增删改排序
const adminCat = new Hono()

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
  const exists = db.prepare('SELECT id FROM categories WHERE name=?').get(trimmed)
  if (exists) return c.json({ error: '该分类已存在' }, 400)
  const maxSort = db.prepare('SELECT COALESCE(MAX(sort), 0) m FROM categories').get() as {
    m: number
  }
  const info = db
    .prepare('INSERT INTO categories (name, sort, created_at) VALUES (?, ?, ?)')
    .run(trimmed, maxSort.m + 1, now())
  return c.json(db.prepare('SELECT * FROM categories WHERE id=?').get(info.lastInsertRowid), 201)
})

// 改名 / 上移下移（direction）
adminCat.put('/categories/:id', requireAuth, async (c) => {
  const id = Number(c.req.param('id'))
  const row = db.prepare('SELECT * FROM categories WHERE id=?').get(id) as CategoryRow | undefined
  if (!row) return c.json({ error: '分类不存在' }, 404)
  const body = await c.req.json<{ name?: string; direction?: 'up' | 'down' }>()

  if (body.name !== undefined) {
    const trimmed = body.name.trim()
    if (!trimmed) return c.json({ error: '分类名不能为空' }, 400)
    const dup = db.prepare('SELECT id FROM categories WHERE name=? AND id!=?').get(trimmed, id)
    if (dup) return c.json({ error: '该分类已存在' }, 400)
    db.prepare('UPDATE categories SET name=? WHERE id=?').run(trimmed, id)
  }

  if (body.direction) {
    const neighborSql =
      body.direction === 'up'
        ? 'SELECT * FROM categories WHERE sort < ? ORDER BY sort DESC, id DESC LIMIT 1'
        : 'SELECT * FROM categories WHERE sort > ? ORDER BY sort ASC, id ASC LIMIT 1'
    const neighbor = db.prepare(neighborSql).get(row.sort) as CategoryRow | undefined
    if (neighbor) {
      const swap = db.transaction(() => {
        db.prepare('UPDATE categories SET sort=? WHERE id=?').run(neighbor.sort, row.id)
        db.prepare('UPDATE categories SET sort=? WHERE id=?').run(row.sort, neighbor.id)
      })
      swap()
    }
  }

  return c.json(db.prepare('SELECT * FROM categories WHERE id=?').get(id))
})

// 删除分类（已有作品保留原分类文字，仅从选项中移除）
adminCat.delete('/categories/:id', requireAuth, (c) => {
  const info = db.prepare('DELETE FROM categories WHERE id=?').run(c.req.param('id'))
  if (info.changes === 0) return c.json({ error: '分类不存在' }, 404)
  return c.json({ ok: true })
})

export { publicCat as categoriesPublicRoutes, adminCat as categoriesAdminRoutes }
