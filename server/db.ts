// Cloudflare D1 数据层：SQL 与本地版完全一致（纯 SQLite 语法），
// 区别仅在于 D1 是异步绑定。路由统一通过 qAll/qGet/qRun 访问。
import type { Context } from 'hono'

export interface Env {
  DB: D1Database
  MEDIA: R2Bucket
  SECRET: string
  COOKIE_SECURE?: string
}

export type AppContext = Context<{ Bindings: Env }>

export async function qAll<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const stmt = params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql)
  const r = await stmt.all()
  return r.results as T[]
}

export async function qGet<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  const stmt = params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql)
  return (await stmt.first()) as T | null
}

export async function qRun(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<D1Result> {
  const stmt = params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql)
  return stmt.run()
}

export interface WorkRow {
  id: number
  title: string
  slug: string
  category: string
  categories: string
  tags: string
  cover: string | null
  cover_source: string | null
  content: string
  status: 'draft' | 'published'
  featured_order: number | null
  bg_theme: 'light' | 'dark'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SettingRow {
  key: string
  value: string
}

export function now(): string {
  return new Date().toISOString()
}
